-- ============================================================
-- Migration 026: Soft Delete (Archive) System
-- ============================================================
-- Adds deleted_at/deleted_by columns to 7 tables, partial indexes,
-- updates RLS policies to filter out archived rows from normal views,
-- adds permanent-delete policies (leads_manager only, after 30 days),
-- and creates a cascade archive function for leads.
-- ============================================================

-- ============================================================
-- PHASE 1: Add deleted_at / deleted_by columns
-- ============================================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES profiles(id);

ALTER TABLE deals ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES profiles(id);

ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES profiles(id);

ALTER TABLE comments ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES profiles(id);

ALTER TABLE statuses ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE statuses ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES profiles(id);

ALTER TABLE tags ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES profiles(id);

ALTER TABLE commission_tiers ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE commission_tiers ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES profiles(id);


-- ============================================================
-- PHASE 2: Partial indexes for archived-items queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_leads_deleted_at ON leads(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_deleted_at ON deals(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_logs_deleted_at ON activity_logs(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_deleted_at ON comments(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_statuses_deleted_at ON statuses(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tags_deleted_at ON tags(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commission_tiers_deleted_at ON commission_tiers(deleted_at) WHERE deleted_at IS NOT NULL;


-- ============================================================
-- PHASE 3: RLS Policy Updates – LEADS
-- ============================================================
-- Strategy: Drop existing SELECT policies and recreate with deleted_at IS NULL.
-- UPDATE policies also get deleted_at IS NULL so archived rows can't be edited
-- (except for the archive/restore UPDATE itself, which sets/clears deleted_at).
-- Existing DELETE policy is replaced with permanent-delete-only policy.

-- 3a. Drop existing leads policies
DROP POLICY IF EXISTS "Leads managers can view all leads" ON leads;
DROP POLICY IF EXISTS "Sales managers can view all leads" ON leads;
DROP POLICY IF EXISTS "Sales can view all leads" ON leads;
DROP POLICY IF EXISTS "Leads managers can update any lead" ON leads;
DROP POLICY IF EXISTS "Sales managers can update any lead" ON leads;
DROP POLICY IF EXISTS "Sales can update any lead" ON leads;
DROP POLICY IF EXISTS "Users with delete permission can delete leads" ON leads;

-- 3b. SELECT – active (non-archived) leads only
CREATE POLICY "Leads managers can view all leads"
  ON leads FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
    )
  );

CREATE POLICY "Sales managers can view all leads"
  ON leads FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'sales_manager'
    )
  );

CREATE POLICY "Sales can view all leads"
  ON leads FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'sales'
      AND profiles.is_active = true
    )
  );

-- 3c. SELECT – archived leads (leads_manager only, for Admin Archive page)
CREATE POLICY "Leads managers can view archived leads"
  ON leads FOR SELECT
  USING (
    deleted_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
    )
  );

-- 3d. UPDATE – active leads only (preserves existing role checks)
CREATE POLICY "Leads managers can update any lead"
  ON leads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
    )
  );

CREATE POLICY "Sales managers can update any lead"
  ON leads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'sales_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'sales_manager'
    )
  );

CREATE POLICY "Sales can update any lead"
  ON leads FOR UPDATE
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'sales'
      AND profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'sales'
      AND profiles.is_active = true
    )
  );

-- 3e. DELETE – permanent delete: leads_manager only, after 30 days archived
CREATE POLICY "Only admins can permanently delete archived leads"
  ON leads FOR DELETE
  USING (
    deleted_at IS NOT NULL
    AND deleted_at < now() - interval '30 days'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
    )
  );


-- ============================================================
-- PHASE 4: RLS Policy Updates – DEALS
-- ============================================================

DROP POLICY IF EXISTS "Leads managers can view all deals" ON deals;
DROP POLICY IF EXISTS "Sales managers can view all deals" ON deals;
DROP POLICY IF EXISTS "Sales and managers can view relevant deals" ON deals;
DROP POLICY IF EXISTS "Leads managers can update any deal" ON deals;
DROP POLICY IF EXISTS "Sales managers can update any deal" ON deals;
DROP POLICY IF EXISTS "Sales and managers can update deals" ON deals;
DROP POLICY IF EXISTS "Leads managers can delete any deal" ON deals;
DROP POLICY IF EXISTS "Sales managers can delete any deal" ON deals;
DROP POLICY IF EXISTS "Sales can delete deals they created or for their assigned leads" ON deals;

-- SELECT – active deals
CREATE POLICY "Leads managers can view all deals"
  ON deals FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Sales managers can view all deals"
  ON deals FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'sales_manager'
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Sales and managers can view relevant deals"
  ON deals FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('sales', 'sales_manager')
      AND profiles.is_active = true
    )
  );

-- SELECT – archived deals (leads_manager only)
CREATE POLICY "Leads managers can view archived deals"
  ON deals FOR SELECT
  USING (
    deleted_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
    )
  );

-- UPDATE – active deals
CREATE POLICY "Leads managers can update any deal"
  ON deals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Sales managers can update any deal"
  ON deals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'sales_manager'
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Sales and managers can update deals"
  ON deals FOR UPDATE
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('sales', 'sales_manager')
      AND profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('sales', 'sales_manager')
      AND profiles.is_active = true
    )
  );

-- DELETE – permanent delete: leads_manager only, after 30 days
CREATE POLICY "Only admins can permanently delete archived deals"
  ON deals FOR DELETE
  USING (
    deleted_at IS NOT NULL
    AND deleted_at < now() - interval '30 days'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
    )
  );


-- ============================================================
-- PHASE 5: RLS Policy Updates – ACTIVITY_LOGS
-- ============================================================

DROP POLICY IF EXISTS "Users can view activity logs for accessible leads" ON activity_logs;

-- SELECT – active activities
CREATE POLICY "Users can view activity logs for accessible leads"
  ON activity_logs FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = activity_logs.lead_id
      AND (
        leads.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('leads_manager', 'sales_manager')
        )
      )
    )
  );

-- SELECT – archived activities (leads_manager only)
CREATE POLICY "Leads managers can view archived activities"
  ON activity_logs FOR SELECT
  USING (
    deleted_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
    )
  );

-- DELETE – permanent delete
CREATE POLICY "Only admins can permanently delete archived activities"
  ON activity_logs FOR DELETE
  USING (
    deleted_at IS NOT NULL
    AND deleted_at < now() - interval '30 days'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
    )
  );


-- ============================================================
-- PHASE 6: RLS Policy Updates – COMMENTS
-- ============================================================

DROP POLICY IF EXISTS "Users can view comments for accessible leads" ON comments;

-- SELECT – active comments
CREATE POLICY "Users can view comments for accessible leads"
  ON comments FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = comments.lead_id
      AND (
        leads.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('leads_manager', 'sales_manager')
        )
      )
    )
  );

-- SELECT – archived comments (leads_manager only)
CREATE POLICY "Leads managers can view archived comments"
  ON comments FOR SELECT
  USING (
    deleted_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
    )
  );

-- DELETE – permanent delete
CREATE POLICY "Only admins can permanently delete archived comments"
  ON comments FOR DELETE
  USING (
    deleted_at IS NOT NULL
    AND deleted_at < now() - interval '30 days'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
    )
  );


-- ============================================================
-- PHASE 7: RLS Policy Updates – STATUSES
-- ============================================================

DROP POLICY IF EXISTS "All authenticated users can view statuses" ON statuses;

-- SELECT – active statuses
CREATE POLICY "All authenticated users can view statuses"
  ON statuses FOR SELECT
  USING (
    deleted_at IS NULL
    AND auth.role() = 'authenticated'
  );

-- SELECT – archived statuses (leads_manager only)
CREATE POLICY "Leads managers can view archived statuses"
  ON statuses FOR SELECT
  USING (
    deleted_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
    )
  );

-- DELETE – permanent delete
CREATE POLICY "Only admins can permanently delete archived statuses"
  ON statuses FOR DELETE
  USING (
    deleted_at IS NOT NULL
    AND deleted_at < now() - interval '30 days'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
    )
  );


-- ============================================================
-- PHASE 8: RLS Policy Updates – TAGS
-- ============================================================

DROP POLICY IF EXISTS "All authenticated users can view tags" ON tags;

-- SELECT – active tags (non-archived)
CREATE POLICY "All authenticated users can view tags"
  ON tags FOR SELECT
  USING (
    deleted_at IS NULL
    AND auth.role() = 'authenticated'
  );

-- SELECT – archived tags (leads_manager only)
CREATE POLICY "Leads managers can view archived tags"
  ON tags FOR SELECT
  USING (
    deleted_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
    )
  );

-- DELETE – permanent delete
CREATE POLICY "Only admins can permanently delete archived tags"
  ON tags FOR DELETE
  USING (
    deleted_at IS NOT NULL
    AND deleted_at < now() - interval '30 days'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
    )
  );


-- ============================================================
-- PHASE 9: RLS Policy Updates – COMMISSION_TIERS
-- ============================================================

DROP POLICY IF EXISTS "anyone_can_read_tiers" ON commission_tiers;

-- SELECT – active tiers
CREATE POLICY "anyone_can_read_tiers"
  ON commission_tiers FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM commission_templates
      WHERE commission_templates.id = commission_tiers.template_id
      AND commission_templates.is_active = true
    )
  );

-- SELECT – archived tiers (leads_manager only)
CREATE POLICY "Leads managers can view archived commission tiers"
  ON commission_tiers FOR SELECT
  USING (
    deleted_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
    )
  );

-- DELETE – permanent delete
CREATE POLICY "Only admins can permanently delete archived commission tiers"
  ON commission_tiers FOR DELETE
  USING (
    deleted_at IS NOT NULL
    AND deleted_at < now() - interval '30 days'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
    )
  );


-- ============================================================
-- PHASE 10: Cascade Archive Function
-- ============================================================
-- When a lead is archived, cascade to its deals, activities, and comments.
-- When restored, cascade restore as well.

CREATE OR REPLACE FUNCTION archive_lead_cascade(
  p_lead_id uuid,
  p_deleted_by uuid
) RETURNS void AS $$
BEGIN
  -- Archive the lead
  UPDATE leads
  SET deleted_at = now(), deleted_by = p_deleted_by
  WHERE id = p_lead_id AND deleted_at IS NULL;

  -- Cascade to deals
  UPDATE deals
  SET deleted_at = now(), deleted_by = p_deleted_by
  WHERE lead_id = p_lead_id AND deleted_at IS NULL;

  -- Cascade to activities
  UPDATE activity_logs
  SET deleted_at = now(), deleted_by = p_deleted_by
  WHERE lead_id = p_lead_id AND deleted_at IS NULL;

  -- Cascade to comments
  UPDATE comments
  SET deleted_at = now(), deleted_by = p_deleted_by
  WHERE lead_id = p_lead_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION restore_lead_cascade(
  p_lead_id uuid
) RETURNS void AS $$
BEGIN
  -- Restore the lead
  UPDATE leads
  SET deleted_at = NULL, deleted_by = NULL
  WHERE id = p_lead_id AND deleted_at IS NOT NULL;

  -- Cascade restore to deals
  UPDATE deals
  SET deleted_at = NULL, deleted_by = NULL
  WHERE lead_id = p_lead_id AND deleted_at IS NOT NULL;

  -- Cascade restore to activities
  UPDATE activity_logs
  SET deleted_at = NULL, deleted_by = NULL
  WHERE lead_id = p_lead_id AND deleted_at IS NOT NULL;

  -- Cascade restore to comments
  UPDATE comments
  SET deleted_at = NULL, deleted_by = NULL
  WHERE lead_id = p_lead_id AND deleted_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- PHASE 11: Update leads_with_author_name view
-- ============================================================
-- Recreate the view to include the new columns and filter out archived leads

CREATE OR REPLACE VIEW leads_with_author_name AS
SELECT
  leads.*,
  get_author_name(leads.first_name, leads.last_name) AS computed_author_name
FROM leads
WHERE leads.deleted_at IS NULL;
