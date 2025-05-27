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
          console.log('Deals change detected:', payload);
          // Invalidate all deals queries
          queryClient.invalidateQueries({ queryKey: ['deals'] });
          
          // If we have the specific deal ID, also invalidate individual deal queries
          if ((payload.new as any)?.id || (payload.old as any)?.id) {
            const dealId = (payload.new as any)?.id || (payload.old as any)?.id;
            queryClient.invalidateQueries({ queryKey: ['deal', dealId] });
          }
          
          // If we have the lead ID, invalidate lead queries since deals affect lead data
          if ((payload.new as any)?.lead_id || (payload.old as any)?.lead_id) {
            const leadId = (payload.new as any)?.lead_id || (payload.old as any)?.lead_id;
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