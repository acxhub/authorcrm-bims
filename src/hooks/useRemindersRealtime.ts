import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export function useRemindersRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('reminders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reminders' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['reminders'] });

          const id = (payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id;
          if (id) {
            queryClient.invalidateQueries({ queryKey: ['reminder', id] });
          }

          const leadId = (payload.new as { lead_id?: string })?.lead_id || (payload.old as { lead_id?: string })?.lead_id;
          if (leadId) {
            queryClient.invalidateQueries({ queryKey: ['reminders', 'by-lead', leadId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
