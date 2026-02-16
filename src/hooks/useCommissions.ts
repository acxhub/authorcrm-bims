import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commissionsApi } from '@/lib/api/commissions';
import type { CommissionsFilter, CreateCommissionData } from '@/lib/api/commissions';
import { toast } from '@/hooks/use-toast';

// Commission list queries
export const useCommissions = (filters: CommissionsFilter = {}, page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['commissions', filters, page, limit],
    queryFn: () => commissionsApi.getCommissions(filters, page, limit),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCommission = (id: string) => {
  return useQuery({
    queryKey: ['commission', id],
    queryFn: () => commissionsApi.getCommissionById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCommissionsByDeal = (dealId: string) => {
  return useQuery({
    queryKey: ['commissions', 'by-deal', dealId],
    queryFn: () => commissionsApi.getCommissionsByDealId(dealId),
    enabled: !!dealId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCommissionsByAgent = (agentId: string) => {
  return useQuery({
    queryKey: ['commissions', 'by-agent', agentId],
    queryFn: () => commissionsApi.getCommissionsByAgentId(agentId),
    enabled: !!agentId,
    staleTime: 5 * 60 * 1000,
  });
};

// Commission mutations
export const useCreateCommission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommissionData) => commissionsApi.createCommission(data),
    onSuccess: (newCommission) => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.setQueryData(['commission', newCommission.id], newCommission);
      if (newCommission.deal_id) {
        queryClient.invalidateQueries({ queryKey: ['commissions', 'by-deal', newCommission.deal_id] });
      }
      if (newCommission.agent_id) {
        queryClient.invalidateQueries({ queryKey: ['commissions', 'by-agent', newCommission.agent_id] });
      }
      toast({
        title: 'Commission created',
        description: `Commission of $${newCommission.total_commission_amount?.toFixed(2)} has been created.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating commission',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useOverrideCommission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, amount, reason, overriddenBy }: {
      id: string;
      amount: number;
      reason: string;
      overriddenBy: string;
    }) => commissionsApi.overrideCommission(id, amount, reason, overriddenBy),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.setQueryData(['commission', updated.id], updated);
      queryClient.invalidateQueries({ queryKey: ['commission-audit-log', updated.id] });
      toast({
        title: 'Commission overridden',
        description: `Commission has been overridden to $${updated.total_commission_amount?.toFixed(2)}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error overriding commission',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useApproveCommission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, approvedBy }: { id: string; approvedBy: string }) =>
      commissionsApi.approveCommission(id, approvedBy),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.setQueryData(['commission', updated.id], updated);
      toast({
        title: 'Commission approved',
        description: 'Commission has been approved for payout.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error approving commission',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useRejectCommission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason, rejectedBy }: { id: string; reason: string; rejectedBy: string }) =>
      commissionsApi.rejectCommission(id, reason, rejectedBy),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.setQueryData(['commission', updated.id], updated);
      toast({
        title: 'Commission rejected',
        description: 'Commission has been rejected.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error rejecting commission',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useMarkCommissionPaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, paidBy }: { id: string; paidBy: string }) =>
      commissionsApi.markCommissionPaid(id, paidBy),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.setQueryData(['commission', updated.id], updated);
      toast({
        title: 'Commission marked as paid',
        description: 'Commission has been marked as paid.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error marking commission as paid',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useBulkApproveCommissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, approvedBy }: { ids: string[]; approvedBy: string }) =>
      commissionsApi.bulkApproveCommissions(ids, approvedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      toast({
        title: 'Commissions approved',
        description: 'Selected commissions have been approved for payout.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error approving commissions',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Agent Commission Settings
export const useAgentCommissionSettings = (agentId: string) => {
  return useQuery({
    queryKey: ['agent-commission-settings', agentId],
    queryFn: () => commissionsApi.getAgentSettings(agentId),
    enabled: !!agentId,
    staleTime: 10 * 60 * 1000,
  });
};

export const useAllAgentCommissionSettings = () => {
  return useQuery({
    queryKey: ['agent-commission-settings'],
    queryFn: () => commissionsApi.getAllAgentSettings(),
    staleTime: 10 * 60 * 1000,
  });
};

export const useUpsertAgentCommissionSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agentId, settings }: {
      agentId: string;
      settings: Parameters<typeof commissionsApi.upsertAgentSettings>[1];
    }) => commissionsApi.upsertAgentSettings(agentId, settings),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['agent-commission-settings'] });
      queryClient.setQueryData(['agent-commission-settings', updated.agent_id], updated);
      toast({
        title: 'Settings saved',
        description: 'Agent commission settings have been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error saving settings',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Audit Log
export const useCommissionAuditLog = (commissionId: string) => {
  return useQuery({
    queryKey: ['commission-audit-log', commissionId],
    queryFn: () => commissionsApi.getAuditLog(commissionId),
    enabled: !!commissionId,
    staleTime: 2 * 60 * 1000,
  });
};
