import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dealsApi } from '@/lib/api/deals';
import type { Deal, CreateDealData, UpdateDealData, DealsFilter } from '@/lib/api/deals';
import { toast } from '@/hooks/use-toast';
import { useAuth, useProfile } from '@/hooks/useAuth';
import { useUsersContext } from '@/contexts/UsersContext';
import { notify, getManagers } from '@/lib/notifications/notify';

export const useDeals = (filters: DealsFilter = {}, page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['deals', filters, page, limit],
    queryFn: () => dealsApi.getDeals(filters, page, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useDeal = (id: string) => {
  return useQuery({
    queryKey: ['deals', id],
    queryFn: () => dealsApi.getDealById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useDealsByLeadId = (leadId: string) => {
  return useQuery({
    queryKey: ['deals', 'by-lead', leadId],
    queryFn: () => dealsApi.getDealsByLeadId(leadId),
    enabled: !!leadId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateDeal = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { users } = useUsersContext();

  return useMutation({
    mutationFn: (data: CreateDealData) => dealsApi.createDeal(data),
    onSuccess: (newDeal: Deal) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.setQueryData(['deals', newDeal.id], newDeal);
      queryClient.invalidateQueries({ queryKey: ['deals', 'by-lead', newDeal.lead_id] });
      if (user?.id) {
        notify.dealCreated({
          actorId: user.id,
          actorName: profile?.full_name || 'Someone',
          deal: { id: newDeal.id, offer_title: newDeal.offer_title, assigned_to: newDeal.assigned_to, deal_value: newDeal.deal_value },
          managers: getManagers(users),
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating deal', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDealData }) =>
      dealsApi.updateDeal(id, data),
    onSuccess: (updatedDeal: Deal) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.setQueryData(['deals', updatedDeal.id], updatedDeal);
      queryClient.invalidateQueries({ queryKey: ['deals', 'by-lead', updatedDeal.lead_id] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating deal', description: error.message, variant: 'destructive' });
    },
  });
};

export const useArchiveDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, deletedBy }: { id: string; deletedBy: string }) =>
      dealsApi.archiveDeal(id, deletedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['archived-deals'] });
      toast({ title: 'Deal archived', description: 'Deal has been archived successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error archiving deal', description: error.message, variant: 'destructive' });
    },
  });
};

export const useRestoreDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dealsApi.restoreDeal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['archived-deals'] });
      toast({ title: 'Deal restored', description: 'Deal has been restored successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error restoring deal', description: error.message, variant: 'destructive' });
    },
  });
};

export const usePermanentlyDeleteDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dealsApi.permanentlyDeleteDeal(id),
    onSuccess: (_, deletedId: string) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['archived-deals'] });
      queryClient.removeQueries({ queryKey: ['deals', deletedId] });
      toast({ title: 'Deal permanently deleted', description: 'Deal has been permanently removed.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting deal', description: error.message, variant: 'destructive' });
    },
  });
};

export const useArchivedDeals = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['archived-deals', page, limit],
    queryFn: () => dealsApi.getArchivedDeals(page, limit),
    staleTime: 5 * 60 * 1000,
  });
};

export const useAssignDeal = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { users } = useUsersContext();

  return useMutation({
    mutationFn: ({ dealId, assignedTo, previousAssigneeId }: { dealId: string; assignedTo: string | null; previousAssigneeId?: string | null }) =>
      dealsApi.assignDeal(dealId, assignedTo),
    onSuccess: (updatedDeal: Deal, { previousAssigneeId }) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.setQueryData(['deals', updatedDeal.id], updatedDeal);
      if (user?.id && updatedDeal.assigned_to) {
        notify.dealAssigned({
          actorId: user.id,
          actorName: profile?.full_name || 'Someone',
          deal: { id: updatedDeal.id, offer_title: updatedDeal.offer_title },
          newAssigneeId: updatedDeal.assigned_to,
          previousAssigneeId: previousAssigneeId || null,
          managers: getManagers(users),
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error assigning deal', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateDealStatus = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { users } = useUsersContext();

  return useMutation({
    mutationFn: ({ dealId, statusId }: { dealId: string; statusId: string }) =>
      dealsApi.updateDealStatus(dealId, statusId),
    onSuccess: (updatedDeal: Deal) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.setQueryData(['deals', updatedDeal.id], updatedDeal);
      if (user?.id) {
        const statusName = updatedDeal.status?.name || '';
        const isClosedWon = statusName.toLowerCase().includes('won') || statusName.toLowerCase().includes('sold');
        notify.dealStatusChanged({
          actorId: user.id,
          actorName: profile?.full_name || 'Someone',
          deal: { id: updatedDeal.id, offer_title: updatedDeal.offer_title, assigned_to: updatedDeal.assigned_to, deal_value: updatedDeal.deal_value },
          newStatusName: statusName,
          isClosedWon,
          managers: getManagers(users),
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating deal status', description: error.message, variant: 'destructive' });
    },
  });
}; 