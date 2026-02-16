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
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          
          // If we have the specific lead ID, also invalidate individual lead queries
          if ((payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id) {
            const leadId = (payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id;
            queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lead_tags' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['leads'] });
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