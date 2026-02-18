-- Lead Manager Cockpit RPC functions
-- Replaces client-side filtering that fetched entire tables (silently truncated at 1000 rows)

-- 1. Dashboard counts: all 6 key metrics in a single query
CREATE OR REPLACE FUNCTION get_lead_manager_counts(p_stale_days integer DEFAULT 60)
RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  stale_date timestamptz := now() - (p_stale_days || ' days')::interval;
  result json;
BEGIN
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


-- 2. Agent workloads: per-agent aggregated lead data
CREATE OR REPLACE FUNCTION get_lead_manager_agent_workloads()
RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result json;
BEGIN
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


-- 3. Status distribution: count of leads per status
CREATE OR REPLACE FUNCTION get_status_distribution()
RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result json;
BEGIN
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


-- 4. Tag distribution: count of leads per tag
CREATE OR REPLACE FUNCTION get_tag_distribution()
RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result json;
BEGIN
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


-- 5. Paginated lead IDs for various filter types (used by modals)
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
AS $$
DECLARE
  v_offset integer := (p_page - 1) * p_limit;
  stale_date timestamptz := now() - (p_stale_days || ' days')::interval;
  result json;
BEGIN
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


-- 6. Agent lead counts for auto-assignment (lightweight alternative to fetching all leads)
CREATE OR REPLACE FUNCTION get_agent_lead_counts()
RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result json;
BEGIN
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
