import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export function useLeadsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          console.log('Leads change detected:', payload);
          // Invalidate all leads queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          
          // If we have the specific lead ID, also invalidate individual lead queries
          if ((payload.new as any)?.id || (payload.old as any)?.id) {
            const leadId = (payload.new as any)?.id || (payload.old as any)?.id;
            queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lead_tags' },
        (payload) => {
          console.log('Lead tags change detected:', payload);
          // Invalidate leads queries since tags affect lead data
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          
          // If we have the lead ID, invalidate that specific lead
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