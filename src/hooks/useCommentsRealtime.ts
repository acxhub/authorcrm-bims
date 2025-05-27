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
          console.log('Comments change detected:', payload);
          // Invalidate all comments queries
          queryClient.invalidateQueries({ queryKey: ['comments'] });
          
          // If we have the lead ID, invalidate comments for that specific lead
          if ((payload.new as any)?.lead_id || (payload.old as any)?.lead_id) {
            const leadId = (payload.new as any)?.lead_id || (payload.old as any)?.lead_id;
            queryClient.invalidateQueries({ queryKey: ['comments', leadId] });
          }
          
          // If we have the specific comment ID, also invalidate individual comment queries
          if ((payload.new as any)?.id || (payload.old as any)?.id) {
            const commentId = (payload.new as any)?.id || (payload.old as any)?.id;
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