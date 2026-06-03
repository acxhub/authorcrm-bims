-- 042_quickstats_untouched_alignment.sql
--
-- Fix: the "Untouched" quick-stat card count did not match the ?noActivities=true list.
-- get_filtered_lead_ids(p_untouched) defines untouched as "never engaged" (no activities
-- AND no tags AND no deals AND no comments), but get_leads_quick_stats only checked for
-- missing activity_logs — so the card over-counted (2,865 vs 533 actual list rows).
-- Align the card to the list's stricter, correct definition.

CREATE OR REPLACE FUNCTION public.get_leads_quick_stats()
 RETURNS json
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_new_id uuid;
  v_won_id uuid;
BEGIN
  SELECT id INTO v_new_id FROM statuses WHERE name = 'New Lead' AND is_active = true LIMIT 1;
  SELECT id INTO v_won_id FROM statuses WHERE name = 'Closed Won' AND is_active = true LIMIT 1;

  RETURN json_build_object(
    'new_lead', (
      SELECT count(*)::integer FROM leads l
      WHERE l.deleted_at IS NULL AND v_new_id IS NOT NULL AND l.status_id = v_new_id
    ),
    'in_pipeline', (
      SELECT count(DISTINCT l.id)::integer FROM leads l
      WHERE l.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM deals d WHERE d.lead_id = l.id AND d.deleted_at IS NULL
        )
    ),
    'closed_won', (
      SELECT count(*)::integer FROM leads l
      WHERE l.deleted_at IS NULL AND v_won_id IS NOT NULL AND l.status_id = v_won_id
    ),
    -- "Untouched" must match the get_filtered_lead_ids p_untouched filter exactly:
    -- never engaged via activities, tags, deals, or comments.
    'untouched', (
      SELECT count(*)::integer FROM leads l
      WHERE l.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM activity_logs al WHERE al.lead_id = l.id AND al.deleted_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM lead_tags lt WHERE lt.lead_id = l.id)
        AND NOT EXISTS (SELECT 1 FROM deals d WHERE d.lead_id = l.id AND d.deleted_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM comments c WHERE c.lead_id = l.id AND c.deleted_at IS NULL)
    ),
    'new_lead_status_id', v_new_id,
    'closed_won_status_id', v_won_id
  );
END;
$function$;
