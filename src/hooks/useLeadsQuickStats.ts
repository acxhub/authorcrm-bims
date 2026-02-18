import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LeadsQuickStats {
  new_lead: number;
  in_pipeline: number;
  closed_won: number;
  untouched: number;
  new_lead_status_id: string | null;
  closed_won_status_id: string | null;
}

export function useLeadsQuickStats() {
  return useQuery({
    queryKey: ['leads-quick-stats'],
    queryFn: async (): Promise<LeadsQuickStats> => {
      const { data, error } = await supabase.rpc('get_leads_quick_stats');
      
      if (error) {
        console.error('Error fetching leads quick stats:', error);
        throw error;
      }
      
      return data as LeadsQuickStats;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
