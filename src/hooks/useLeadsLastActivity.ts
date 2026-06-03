import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeadLastActivity {
  lead_id: string;
  last_activity_at: string;
}

/**
 * Returns a Map of lead_id -> last activity timestamp (ISO string) for the
 * supplied lead ids. Activities are logged against the lead, so this is the
 * real "last engaged" signal — unlike deals.updated_at, which only changes
 * when the deal row itself is edited.
 */
export function useLeadsLastActivity(leadIds: string[]) {
  // Stable, order-independent key so identical id sets share a cache entry.
  const sortedIds = [...new Set(leadIds)].sort();

  return useQuery<Map<string, string>>({
    queryKey: ['leads-last-activity', sortedIds],
    enabled: sortedIds.length > 0,
    staleTime: 2 * 60 * 1000, // align with activity staleTime tier
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leads_last_activity', {
        p_lead_ids: sortedIds,
      });
      if (error) throw new Error(`Failed to fetch lead activity: ${error.message}`);

      const rows = (data as unknown as LeadLastActivity[]) || [];
      return new Map(rows.map((r) => [r.lead_id, r.last_activity_at]));
    },
  });
}
