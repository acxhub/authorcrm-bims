-- Optional pen name for author / lead profile
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pen_name text;

-- Include pen_name in lead list RPC search
CREATE OR REPLACE FUNCTION get_filtered_lead_ids(
  p_no_tags boolean DEFAULT false,
  p_untouched boolean DEFAULT false,
  p_search text DEFAULT NULL,
  p_status_ids uuid[] DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL,
  p_assignment_status text DEFAULT 'all',
  p_created_by uuid DEFAULT NULL,
  p_date_from text DEFAULT NULL,
  p_date_to text DEFAULT NULL,
  p_tag_ids uuid[] DEFAULT NULL,
  p_include_archived boolean DEFAULT false,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 50
)
RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_offset integer := (p_page - 1) * p_limit;
  result json;
BEGIN
  WITH filtered AS (
    SELECT l.id, l.is_pinned, l.pinned_at, l.assigned_at, l.created_at
    FROM leads l
    WHERE
      (p_include_archived OR l.deleted_at IS NULL)
      AND (p_search IS NULL OR (
        l.book_title ILIKE '%' || p_search || '%'
        OR l.author_name ILIKE '%' || p_search || '%'
        OR l.first_name ILIKE '%' || p_search || '%'
        OR l.last_name ILIKE '%' || p_search || '%'
        OR l.pen_name ILIKE '%' || p_search || '%'
        OR l.primary_email ILIKE '%' || p_search || '%'
        OR l.phone_number_1 ILIKE '%' || p_search || '%'
        OR l.publisher ILIKE '%' || p_search || '%'
      ))
      AND (p_status_ids IS NULL OR l.status_id = ANY(p_status_ids))
      AND (p_assigned_to IS NULL OR l.assigned_to = p_assigned_to)
      AND (
        p_assignment_status = 'all'
        OR (p_assignment_status = 'assigned' AND l.assigned_to IS NOT NULL)
        OR (p_assignment_status = 'unassigned' AND l.assigned_to IS NULL)
      )
      AND (p_created_by IS NULL OR l.created_by = p_created_by)
      AND (p_date_from IS NULL OR l.created_at >= p_date_from::timestamptz)
      AND (p_date_to IS NULL OR l.created_at <= p_date_to::timestamptz)
      AND (p_tag_ids IS NULL OR EXISTS (
        SELECT 1 FROM lead_tags lt WHERE lt.lead_id = l.id AND lt.tag_id = ANY(p_tag_ids)
      ))
      AND (NOT p_no_tags OR NOT EXISTS (
        SELECT 1 FROM lead_tags lt WHERE lt.lead_id = l.id
      ))
      AND (NOT p_untouched OR (
        NOT EXISTS (SELECT 1 FROM activity_logs al WHERE al.lead_id = l.id AND al.deleted_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM lead_tags lt2 WHERE lt2.lead_id = l.id)
        AND NOT EXISTS (SELECT 1 FROM deals d WHERE d.lead_id = l.id AND d.deleted_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM comments c WHERE c.lead_id = l.id AND c.deleted_at IS NULL)
      ))
  ),
  counted AS (
    SELECT count(*) as total FROM filtered
  ),
  sorted AS (
    SELECT id
    FROM filtered
    ORDER BY is_pinned DESC, pinned_at DESC NULLS LAST, assigned_at DESC NULLS LAST, created_at DESC
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
