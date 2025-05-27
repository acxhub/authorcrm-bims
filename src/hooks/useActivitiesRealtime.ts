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
          console.log('Activities change detected:', payload);
          // Invalidate all activities queries
          queryClient.invalidateQueries({ queryKey: ['activities'] });
          
          // If we have the lead ID, invalidate activities for that specific lead
          if ((payload.new as any)?.lead_id || (payload.old as any)?.lead_id) {
            const leadId = (payload.new as any)?.lead_id || (payload.old as any)?.lead_id;
            queryClient.invalidateQueries({ queryKey: ['activities', leadId] });
          }
          
          // If we have the specific activity ID, also invalidate individual activity queries
          if ((payload.new as any)?.id || (payload.old as any)?.id) {
            const activityId = (payload.new as any)?.id || (payload.old as any)?.id;
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