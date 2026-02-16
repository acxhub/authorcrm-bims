import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export function useDealsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('deals-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deals' },
        (payload) => {
          // Invalidate all deals queries
          queryClient.invalidateQueries({ queryKey: ['deals'] });
          // useDeal(id) uses ['deals', id]
          if ((payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id) {
            const dealId = (payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id;
            queryClient.invalidateQueries({ queryKey: ['deals', dealId] });
          }
          
          // If we have the lead ID, invalidate lead queries since deals affect lead data
          if ((payload.new as { lead_id?: string })?.lead_id || (payload.old as { lead_id?: string })?.lead_id) {
            const leadId = (payload.new as { lead_id?: string })?.lead_id || (payload.old as { lead_id?: string })?.lead_id;
            queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
} 