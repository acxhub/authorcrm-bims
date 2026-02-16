import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dealsApi } from '@/lib/api/deals';
import type { Deal, CreateDealData, UpdateDealData, DealsFilter } from '@/lib/api/deals';
import { toast } from '@/hooks/use-toast';

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

  return useMutation({
    mutationFn: (data: CreateDealData) => dealsApi.createDeal(data),
    onSuccess: (newDeal: Deal) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.setQueryData(['deals', newDeal.id], newDeal);
      queryClient.invalidateQueries({ queryKey: ['deals', 'by-lead', newDeal.lead_id] });
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

export const useDeleteDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dealsApi.deleteDeal(id),
    onSuccess: (_, deletedId: string) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.removeQueries({ queryKey: ['deals', deletedId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting deal', description: error.message, variant: 'destructive' });
    },
  });
};

export const useAssignDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dealId, assignedTo }: { dealId: string; assignedTo: string | null }) =>
      dealsApi.assignDeal(dealId, assignedTo),
    onSuccess: (updatedDeal: Deal) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.setQueryData(['deals', updatedDeal.id], updatedDeal);
    },
    onError: (error: Error) => {
      toast({ title: 'Error assigning deal', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateDealStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dealId, statusId }: { dealId: string; statusId: string }) =>
      dealsApi.updateDealStatus(dealId, statusId),
    onSuccess: (updatedDeal: Deal) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.setQueryData(['deals', updatedDeal.id], updatedDeal);
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating deal status', description: error.message, variant: 'destructive' });
    },
  });
}; 