-- Restrict role=sales to leads assigned to them (assigned_to = auth.uid()) and related deals.
-- Harden SECURITY DEFINER RPCs. Restrict lead-manager metrics RPCs to leads_manager.
-- Fix comments UPDATE to require ongoing lead access.

-- =============================================================================
-- 1. LEADS — sales SELECT/UPDATE: assigned only
-- =============================================================================

DROP POLICY IF EXISTS "Sales can view all leads" ON leads;
DROP POLICY IF EXISTS "Sales can update any lead" ON leads;
DROP POLICY IF EXISTS "Sales can only view their assigned leads" ON leads;
DROP POLICY IF EXISTS "Sales can view assigned leads" ON leads;
DROP POLICY IF EXISTS "Sales can update assigned leads" ON leads;

CREATE POLICY "Sales can view assigned leads"
  ON leads FOR SELECT
  USING (
    deleted_at IS NULL
    AND assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'sales'
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Sales can update assigned leads"
  ON leads FOR UPDATE
  USING (
    deleted_at IS NULL
    AND assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'sales'
      AND profiles.is_active = true
    )
  )
  WITH CHECK (
    deleted_at IS NULL
    AND assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'sales'
      AND profiles.is_active = true
    )
  );

-- =============================================================================
-- 2. DEALS — split sales vs sales_manager (remove combined policies)
-- =============================================================================

DROP POLICY IF EXISTS "Sales and managers can view relevant deals" ON deals;
DROP POLICY IF EXISTS "Sales and managers can update deals" ON deals;
DROP POLICY IF EXISTS "Sales and managers can create deals" ON deals;
DROP POLICY IF EXISTS "Sales can view deals for assigned leads" ON deals;
DROP POLICY IF EXISTS "Sales can update deals for assigned leads" ON deals;
DROP POLICY IF EXISTS "Sales can create deals for assigned leads" ON deals;

-- Sales: only deals whose parent lead is assigned to them (strict lead assignment)
CREATE POLICY "Sales can view deals for assigned leads"
  ON deals FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'sales'
      AND p.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = deals.lead_id
      AND l.deleted_at IS NULL
      AND l.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Sales can update deals for assigned leads"
  ON deals FOR UPDATE
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'sales'
      AND p.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = deals.lead_id
      AND l.deleted_at IS NULL
      AND l.assigned_to = auth.uid()
    )
  )
  WITH CHECK (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'sales'
      AND p.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = deals.lead_id
      AND l.deleted_at IS NULL
      AND l.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Sales can create deals for assigned leads"
  ON deals FOR INSERT
  WITH CHECK (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'sales'
      AND p.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = deals.lead_id
      AND l.deleted_at IS NULL
      AND l.assigned_to = auth.uid()
    )
  );

-- sales_manager + leads_manager deal policies remain from earlier migrations (026 / 015).

-- =============================================================================
-- 3. COMMENTS — UPDATE must still have lead access (not only user_id match)
-- =============================================================================

DROP POLICY IF EXISTS "Users can update their own comments" ON comments;

CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  USING (
    user_id = auth.uid()
    AND deleted_at IS NULL
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
  )
  WITH CHECK (
    user_id = auth.uid()
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

-- =============================================================================
-- 4. ACTIVITY_LOGS — allow UPDATE for users with lead access (edit / soft-delete)
-- =============================================================================

DROP POLICY IF EXISTS "Users can update activity logs for accessible leads" ON activity_logs;

CREATE POLICY "Users can update activity logs for accessible leads"
  ON activity_logs FOR UPDATE
  USING (
    EXISTS (
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
  )
  WITH CHECK (
    EXISTS (
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

-- =============================================================================
-- 5. SECURITY DEFINER: recycle_lead / bulk_recycle_leads
-- =============================================================================

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

  IF v_role IN ('leads_manager', 'sales_manager') THEN
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

CREATE OR REPLACE FUNCTION bulk_recycle_leads(lead_ids UUID[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_id UUID;
BEGIN
  FOREACH lead_id IN ARRAY lead_ids
  LOOP
    PERFORM recycle_lead(lead_id);
  END LOOP;
END;
$$;

-- =============================================================================
-- 6. SECURITY DEFINER: archive / restore cascade (managers only)
-- =============================================================================

CREATE OR REPLACE FUNCTION archive_lead_cascade(
  p_lead_id uuid,
  p_deleted_by uuid
) RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('leads_manager', 'sales_manager')
    AND COALESCE(is_active, true)
  ) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  UPDATE leads
  SET deleted_at = now(), deleted_by = p_deleted_by
  WHERE id = p_lead_id AND deleted_at IS NULL;

  UPDATE deals
  SET deleted_at = now(), deleted_by = p_deleted_by
  WHERE lead_id = p_lead_id AND deleted_at IS NULL;

  UPDATE activity_logs
  SET deleted_at = now(), deleted_by = p_deleted_by
  WHERE lead_id = p_lead_id AND deleted_at IS NULL;

  UPDATE comments
  SET deleted_at = now(), deleted_by = p_deleted_by
  WHERE lead_id = p_lead_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION restore_lead_cascade(
  p_lead_id uuid
) RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'leads_manager'
    AND COALESCE(is_active, true)
  ) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  UPDATE leads
  SET deleted_at = NULL, deleted_by = NULL
  WHERE id = p_lead_id AND deleted_at IS NOT NULL;

  UPDATE deals
  SET deleted_at = NULL, deleted_by = NULL
  WHERE lead_id = p_lead_id AND deleted_at IS NOT NULL;

  UPDATE activity_logs
  SET deleted_at = NULL, deleted_by = NULL
  WHERE lead_id = p_lead_id AND deleted_at IS NOT NULL;

  UPDATE comments
  SET deleted_at = NULL, deleted_by = NULL
  WHERE lead_id = p_lead_id AND deleted_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- =============================================================================
-- 7. Lead manager cockpit RPCs — only leads_manager (matches /lead-manager route)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_lead_manager_counts(p_stale_days integer DEFAULT 60)
RETURNS json
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  stale_date timestamptz := now() - (p_stale_days || ' days')::interval;
  result json;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'leads_manager' AND COALESCE(is_active, true)
  ) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  SELECT json_build_object(
    'total_active', (SELECT count(*) FROM leads WHERE deleted_at IS NULL),
    'unassigned', (SELECT count(*) FROM leads WHERE deleted_at IS NULL AND assigned_to IS NULL),
    'never_touched', (
      SELECT count(*) FROM leads l
      WHERE l.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM activity_logs al WHERE al.lead_id = l.id AND al.deleted_at IS NULL)
    ),
    'went_cold', (
      SELECT count(*) FROM leads l
      WHERE l.deleted_at IS NULL
      AND EXISTS (SELECT 1 FROM activity_logs al WHERE al.lead_id = l.id AND al.deleted_at IS NULL)
      AND NOT EXISTS (
        SELECT 1 FROM activity_logs al
        WHERE al.lead_id = l.id AND al.deleted_at IS NULL AND al.activity_date >= stale_date
      )
    ),
    'without_tags', (
      SELECT count(*) FROM leads l
      WHERE l.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM lead_tags lt WHERE lt.lead_id = l.id)
    ),
    'orphaned', (
      SELECT count(*) FROM leads l
      JOIN profiles p ON l.assigned_to = p.id
      WHERE l.deleted_at IS NULL AND l.assigned_to IS NOT NULL AND p.is_active = false
    )
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_lead_manager_agent_workloads()
RETURNS json
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'leads_manager' AND COALESCE(is_active, true)
  ) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  WITH agents AS (
    SELECT id, full_name, email, role, avatar_url, is_active
    FROM profiles
    WHERE role IN ('sales', 'sales_manager')
  ),
  lead_counts AS (
    SELECT l.assigned_to, count(*) as total_leads
    FROM leads l
    WHERE l.deleted_at IS NULL AND l.assigned_to IS NOT NULL
    GROUP BY l.assigned_to
  ),
  status_breakdown AS (
    SELECT l.assigned_to, l.status_id, s.name as status_name, s.color, count(*) as cnt
    FROM leads l
    JOIN statuses s ON l.status_id = s.id
    WHERE l.deleted_at IS NULL AND l.assigned_to IS NOT NULL
    GROUP BY l.assigned_to, l.status_id, s.name, s.color
  ),
  tagged_counts AS (
    SELECT l.assigned_to, count(DISTINCT l.id) as leads_with_tags
    FROM leads l
    JOIN lead_tags lt ON lt.lead_id = l.id
    WHERE l.deleted_at IS NULL AND l.assigned_to IS NOT NULL
    GROUP BY l.assigned_to
  ),
  last_activities AS (
    SELECT l.assigned_to, max(al.activity_date) as last_activity_date
    FROM activity_logs al
    JOIN leads l ON al.lead_id = l.id
    WHERE al.deleted_at IS NULL AND l.deleted_at IS NULL AND l.assigned_to IS NOT NULL
    GROUP BY l.assigned_to
  )
  SELECT COALESCE(json_agg(
    json_build_object(
      'userId', a.id,
      'fullName', COALESCE(a.full_name, 'Unknown'),
      'email', COALESCE(a.email, ''),
      'role', a.role,
      'avatarUrl', a.avatar_url,
      'isActive', a.is_active,
      'totalLeads', COALESCE(lc.total_leads, 0),
      'leadsByStatus', COALESCE(
        (SELECT json_agg(json_build_object(
          'statusId', sb.status_id,
          'statusName', sb.status_name,
          'color', sb.color,
          'count', sb.cnt
        ) ORDER BY sb.cnt DESC)
        FROM status_breakdown sb WHERE sb.assigned_to = a.id
        ), '[]'::json),
      'leadsWithTags', COALESCE(tc.leads_with_tags, 0),
      'lastActivityDate', la.last_activity_date
    ) ORDER BY COALESCE(lc.total_leads, 0) DESC
  ), '[]'::json)
  INTO result
  FROM agents a
  LEFT JOIN lead_counts lc ON lc.assigned_to = a.id
  LEFT JOIN tagged_counts tc ON tc.assigned_to = a.id
  LEFT JOIN last_activities la ON la.assigned_to = a.id;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_status_distribution()
RETURNS json
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'leads_manager' AND COALESCE(is_active, true)
  ) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(json_agg(
    json_build_object(
      'statusId', s.id,
      'statusName', s.name,
      'color', s.color,
      'count', COALESCE(lc.cnt, 0)
    ) ORDER BY s.order_index
  ), '[]'::json)
  INTO result
  FROM statuses s
  LEFT JOIN (
    SELECT status_id, count(*) as cnt
    FROM leads
    WHERE deleted_at IS NULL
    GROUP BY status_id
  ) lc ON lc.status_id = s.id
  WHERE s.is_active = true;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_tag_distribution()
RETURNS json
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'leads_manager' AND COALESCE(is_active, true)
  ) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(json_agg(
    json_build_object(
      'tagId', t.id,
      'tagName', t.name,
      'color', t.color,
      'count', COALESCE(tc.cnt, 0)
    ) ORDER BY COALESCE(tc.cnt, 0) DESC
  ), '[]'::json)
  INTO result
  FROM tags t
  LEFT JOIN (
    SELECT lt.tag_id, count(*) as cnt
    FROM lead_tags lt
    JOIN leads l ON l.id = lt.lead_id
    WHERE l.deleted_at IS NULL
    GROUP BY lt.tag_id
  ) tc ON tc.tag_id = t.id
  WHERE t.is_active = true;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_lead_manager_leads(
  p_filter_type text,
  p_stale_days integer DEFAULT 60,
  p_tag_id uuid DEFAULT NULL,
  p_agent_id uuid DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 20
)
RETURNS json
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_offset integer := (p_page - 1) * p_limit;
  stale_date timestamptz := now() - (p_stale_days || ' days')::interval;
  result json;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'leads_manager' AND COALESCE(is_active, true)
  ) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  WITH filtered AS (
    SELECT l.id, l.created_at
    FROM leads l
    WHERE l.deleted_at IS NULL
    AND (
      CASE p_filter_type
        WHEN 'never_touched' THEN
          NOT EXISTS (SELECT 1 FROM activity_logs al WHERE al.lead_id = l.id AND al.deleted_at IS NULL)
        WHEN 'went_cold' THEN
          EXISTS (SELECT 1 FROM activity_logs al WHERE al.lead_id = l.id AND al.deleted_at IS NULL)
          AND NOT EXISTS (
            SELECT 1 FROM activity_logs al
            WHERE al.lead_id = l.id AND al.deleted_at IS NULL AND al.activity_date >= stale_date
          )
        WHEN 'orphaned' THEN
          l.assigned_to IS NOT NULL
          AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = l.assigned_to AND p.is_active = false)
        WHEN 'no_tags' THEN
          NOT EXISTS (SELECT 1 FROM lead_tags lt WHERE lt.lead_id = l.id)
        WHEN 'by_tag' THEN
          EXISTS (SELECT 1 FROM lead_tags lt WHERE lt.lead_id = l.id AND lt.tag_id = p_tag_id)
        WHEN 'unassigned' THEN
          l.assigned_to IS NULL
        WHEN 'by_agent' THEN
          l.assigned_to = p_agent_id
        ELSE true
      END
    )
  ),
  counted AS (
    SELECT count(*) as total FROM filtered
  ),
  sorted AS (
    SELECT id
    FROM filtered
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET v_offset
  )
  SELECT json_build_object(
    'ids', COALESCE((SELECT json_agg(id) FROM sorted), '[]'::json),
    'total', (SELECT total FROM counted)::integer,
    'total_pages', CEIL((SELECT total FROM counted)::numeric / p_limit)::integer
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_agent_lead_counts()
RETURNS json
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'leads_manager' AND COALESCE(is_active, true)
  ) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(json_agg(
    json_build_object(
      'agent_id', assigned_to,
      'count', cnt
    )
  ), '[]'::json)
  INTO result
  FROM (
    SELECT assigned_to, count(*) as cnt
    FROM leads
    WHERE deleted_at IS NULL AND assigned_to IS NOT NULL
    GROUP BY assigned_to
  ) sub;

  RETURN result;
END;
$$;
