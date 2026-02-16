import { useMutation, useQueryClient } from '@tanstack/react-query';
import { commissionsApi } from '@/lib/api/commissions';
import { toast } from '@/hooks/use-toast';

interface CreateCommissionFromDealInput {
  dealId: string;
  agentId: string;
  dealValue: number;
  markupAmount?: number;
}

export const useCreateCommissionFromDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dealId, agentId, dealValue, markupAmount }: CreateCommissionFromDealInput) =>
      commissionsApi.createCommissionForDeal(dealId, agentId, dealValue, markupAmount),
    onSuccess: (commission) => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      if (commission.deal_id) {
        queryClient.invalidateQueries({ queryKey: ['commissions', 'by-deal', commission.deal_id] });
      }
      if (commission.agent_id) {
        queryClient.invalidateQueries({ queryKey: ['commissions', 'by-agent', commission.agent_id] });
      }
      toast({
        title: 'Commission created',
        description: `Commission of $${commission.total_commission_amount?.toLocaleString()} has been auto-generated for this deal.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Commission not created',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
