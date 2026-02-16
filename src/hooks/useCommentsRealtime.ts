import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export function useCommentsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('comments-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['comments'] });
          // useCommentsByLeadId uses ['comments', 'lead', leadId]
          if ((payload.new as { lead_id?: string })?.lead_id || (payload.old as { lead_id?: string })?.lead_id) {
            const leadId = (payload.new as { lead_id?: string })?.lead_id || (payload.old as { lead_id?: string })?.lead_id;
            queryClient.invalidateQueries({ queryKey: ['comments', 'lead', leadId] });
          }
          if ((payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id) {
            const commentId = (payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id;
            queryClient.invalidateQueries({ queryKey: ['comment', commentId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
} 