import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export function useActivitiesRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('activities-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_logs' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['activities'] });
          // useActivitiesByLeadId uses ['activities', 'lead', leadId]
          if ((payload.new as { lead_id?: string })?.lead_id || (payload.old as { lead_id?: string })?.lead_id) {
            const leadId = (payload.new as { lead_id?: string })?.lead_id || (payload.old as { lead_id?: string })?.lead_id;
            queryClient.invalidateQueries({ queryKey: ['activities', 'lead', leadId] });
          }
          if ((payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id) {
            const activityId = (payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id;
            queryClient.invalidateQueries({ queryKey: ['activity', activityId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
} 