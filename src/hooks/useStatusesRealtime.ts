import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export function useStatusesRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('statuses-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'statuses' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['statuses'] });
          
          // Also invalidate leads and deals queries since they include status data
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          queryClient.invalidateQueries({ queryKey: ['deals'] });
          
          // If we have the specific status ID, also invalidate individual status queries
          if ((payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id) {
            const statusId = (payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id;
            queryClient.invalidateQueries({ queryKey: ['status', statusId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
} 