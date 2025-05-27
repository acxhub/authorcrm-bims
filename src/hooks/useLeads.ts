import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi, type Lead, type CreateLeadData, type UpdateLeadData, type LeadsFilter } from '@/lib/api/leads';
import { toast } from '@/hooks/use-toast';

export const useLeads = (filters: LeadsFilter = {}, page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['leads', filters, page, limit],
    queryFn: () => leadsApi.getLeads(filters, page, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useLead = (id: string) => {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadsApi.getLeadById(id),
    enabled: !!id,
  });
};

export const useCreateLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLeadData) => leadsApi.createLead(data),
    onSuccess: (newLead) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Lead created',
        description: `Lead for "${newLead.book_title}" has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating lead',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadData }) => 
      leadsApi.updateLead(id, data),
    onSuccess: (updatedLead) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', updatedLead.id] });
      toast({
        title: 'Lead updated',
        description: `Lead for "${updatedLead.book_title}" has been updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating lead',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => leadsApi.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Lead deleted',
        description: 'Lead has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting lead',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useAssignLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, assignedTo }: { leadId: string; assignedTo: string | null }) =>
      leadsApi.assignLead(leadId, assignedTo),
    onSuccess: (updatedLead) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', updatedLead.id] });
      toast({
        title: 'Lead assigned',
        description: `Lead has been ${updatedLead.assigned_to ? 'assigned' : 'unassigned'} successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error assigning lead',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateLeadStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, statusId }: { leadId: string; statusId: string }) =>
      leadsApi.updateLeadStatus(leadId, statusId),
    onSuccess: (updatedLead) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', updatedLead.id] });
      toast({
        title: 'Status updated',
        description: `Lead status has been updated to "${updatedLead.status.name}".`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useManageLeadTags = () => {
  const queryClient = useQueryClient();

  const addTags = useMutation({
    mutationFn: ({ leadId, tagIds }: { leadId: string; tagIds: string[] }) =>
      leadsApi.addTagsToLead(leadId, tagIds),
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      toast({
        title: 'Tags added',
        description: 'Tags have been added to the lead successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error adding tags',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const removeTags = useMutation({
    mutationFn: ({ leadId, tagIds }: { leadId: string; tagIds: string[] }) =>
      leadsApi.removeTagsFromLead(leadId, tagIds),
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      toast({
        title: 'Tags removed',
        description: 'Tags have been removed from the lead successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error removing tags',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return { addTags, removeTags };
}; 