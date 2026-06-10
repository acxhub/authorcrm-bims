-- Lead Miner: leads-only access (view/create/update all active leads)

CREATE POLICY "Lead miners can view all leads"
  ON leads FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'lead_miner'
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Lead miners can insert leads"
  ON leads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'lead_miner'
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Lead miners can update any lead"
  ON leads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'lead_miner'
      AND profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'lead_miner'
      AND profiles.is_active = true
    )
  );

-- lead_tags: extend manager access to lead_miner
DROP POLICY IF EXISTS "Users can view lead tags for accessible leads" ON lead_tags;
DROP POLICY IF EXISTS "Users can modify lead tags for accessible leads" ON lead_tags;

CREATE POLICY "Users can view lead tags for accessible leads" ON lead_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_tags.lead_id
      AND (
        leads.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = ANY (ARRAY['leads_manager'::user_role, 'sales_manager'::user_role, 'lead_miner'::user_role])
        )
      )
    )
  );

CREATE POLICY "Users can modify lead tags for accessible leads" ON lead_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_tags.lead_id
      AND (
        leads.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = ANY (ARRAY['leads_manager'::user_role, 'sales_manager'::user_role, 'lead_miner'::user_role])
        )
      )
    )
  );

-- recycle_lead: treat lead_miner like a manager
CREATE OR REPLACE FUNCTION recycle_lead(lead_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  unassigned_status_id UUID;
  current_assignee UUID;
  v_role text;
  v_deleted_at timestamptz;
  v_assigned uuid;
BEGIN
  SELECT p.role::text INTO v_role FROM profiles p WHERE p.id = auth.uid();
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT l.assigned_to, l.deleted_at INTO v_assigned, v_deleted_at
  FROM leads l WHERE l.id = lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  IF v_deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot recycle archived lead';
  END IF;

  IF v_role IN ('leads_manager', 'sales_manager', 'lead_miner') THEN
    NULL;
  ELSIF v_role = 'sales' AND v_assigned = auth.uid() THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO unassigned_status_id
  FROM statuses
  WHERE LOWER(name) = 'unassigned'
  LIMIT 1;

  SELECT assigned_to INTO current_assignee
  FROM leads
  WHERE id = lead_id;

  UPDATE leads
  SET
    assigned_to = NULL,
    status_id = unassigned_status_id,
    recycled_at = NOW(),
    recycled_by = auth.uid(),
    previous_assignee = current_assignee,
    updated_at = NOW()
  WHERE id = lead_id;

  INSERT INTO activity_logs (lead_id, user_id, activity_type, summary, activity_date)
  VALUES (
    lead_id,
    auth.uid(),
    'assignment',
    'Lead recycled and unassigned',
    NOW()
  );
END;
$$;
