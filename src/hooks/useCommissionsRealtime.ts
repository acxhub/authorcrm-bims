import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export function useCommissionsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('commissions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'commissions' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['commissions'] });

          const id = (payload.new as any)?.id || (payload.old as any)?.id;
          if (id) {
            queryClient.invalidateQueries({ queryKey: ['commission', id] });
            queryClient.invalidateQueries({ queryKey: ['commission-audit-log', id] });
          }

          const dealId = (payload.new as any)?.deal_id || (payload.old as any)?.deal_id;
          if (dealId) {
            queryClient.invalidateQueries({ queryKey: ['commissions', 'by-deal', dealId] });
          }

          const agentId = (payload.new as any)?.agent_id || (payload.old as any)?.agent_id;
          if (agentId) {
            queryClient.invalidateQueries({ queryKey: ['commissions', 'by-agent', agentId] });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'commission_templates' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['commission-templates'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'commission_tiers' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['commission-templates'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_commission_settings' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['agent-commission-settings'] });
          const agentId = (payload.new as any)?.agent_id || (payload.old as any)?.agent_id;
          if (agentId) {
            queryClient.invalidateQueries({ queryKey: ['agent-commission-settings', agentId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
