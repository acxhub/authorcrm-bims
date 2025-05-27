import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dealsApi } from '@/lib/api/deals';
import type { Deal, CreateDealData, UpdateDealData, DealsFilter } from '@/lib/api/deals';

export const useDeals = (filters: DealsFilter = {}, page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['deals', filters, page, limit],
    queryFn: () => dealsApi.getDeals(filters, page, limit),
  });
};

export const useDeal = (id: string) => {
  return useQuery({
    queryKey: ['deals', id],
    queryFn: () => dealsApi.getDealById(id),
    enabled: !!id,
  });
};

export const useDealsByLeadId = (leadId: string) => {
  return useQuery({
    queryKey: ['deals', 'by-lead', leadId],
    queryFn: () => dealsApi.getDealsByLeadId(leadId),
    enabled: !!leadId,
  });
};

export const useCreateDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDealData) => dealsApi.createDeal(data),
    onSuccess: (newDeal: Deal) => {
      // Invalidate deals queries
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      
      // Update the specific deal query
      queryClient.setQueryData(['deals', newDeal.id], newDeal);
      
      // Update deals by lead query
      queryClient.invalidateQueries({ 
        queryKey: ['deals', 'by-lead', newDeal.lead_id] 
      });
    },
  });
};

export const useUpdateDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDealData }) => 
      dealsApi.updateDeal(id, data),
    onSuccess: (updatedDeal: Deal) => {
      // Invalidate deals queries
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      
      // Update the specific deal query
      queryClient.setQueryData(['deals', updatedDeal.id], updatedDeal);
      
      // Update deals by lead query
      queryClient.invalidateQueries({ 
        queryKey: ['deals', 'by-lead', updatedDeal.lead_id] 
      });
    },
  });
};

export const useDeleteDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dealsApi.deleteDeal(id),
    onSuccess: (_, deletedId: string) => {
      // Invalidate deals queries
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      
      // Remove the specific deal query
      queryClient.removeQueries({ queryKey: ['deals', deletedId] });
    },
  });
};

export const useAssignDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dealId, assignedTo }: { dealId: string; assignedTo: string | null }) => 
      dealsApi.assignDeal(dealId, assignedTo),
    onSuccess: (updatedDeal: Deal) => {
      // Invalidate deals queries
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      
      // Update the specific deal query
      queryClient.setQueryData(['deals', updatedDeal.id], updatedDeal);
    },
  });
};

export const useUpdateDealStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dealId, statusId }: { dealId: string; statusId: string }) => 
      dealsApi.updateDealStatus(dealId, statusId),
    onSuccess: (updatedDeal: Deal) => {
      // Invalidate deals queries
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      
      // Update the specific deal query
      queryClient.setQueryData(['deals', updatedDeal.id], updatedDeal);
    },
  });
}; 