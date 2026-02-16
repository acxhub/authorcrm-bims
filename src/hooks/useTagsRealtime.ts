import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export function useTagsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('tags-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tags' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['tags'] });
          
          // Also invalidate leads queries since they include tag data
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          
          // If we have the specific tag ID, also invalidate individual tag queries
          if ((payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id) {
            const tagId = (payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id;
            queryClient.invalidateQueries({ queryKey: ['tag', tagId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
} 