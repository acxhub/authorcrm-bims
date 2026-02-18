import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi, type Lead, type CreateLeadData, type UpdateLeadData, type LeadsFilter } from '@/lib/api/leads';
import { toast } from '@/hooks/use-toast';
import { useAuth, useProfile } from '@/hooks/useAuth';
import { useUsersContext } from '@/contexts/UsersContext';
import { notify, getManagers } from '@/lib/notifications/notify';

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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateLead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { users } = useUsersContext();

  return useMutation({
    mutationFn: (data: CreateLeadData) => leadsApi.createLead(data),
    onSuccess: (newLead) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Lead created',
        description: `Lead for "${newLead.book_title}" has been created successfully.`,
      });
      if (user?.id) {
        notify.leadCreated({
          actorId: user.id,
          lead: { id: newLead.id, book_title: newLead.book_title, assigned_to: newLead.assigned_to },
          managers: getManagers(users),
        });
      }
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

export const useArchiveLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, deletedBy }: { id: string; deletedBy: string }) =>
      leadsApi.archiveLead(id, deletedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['archived-leads'] });
      toast({
        title: 'Lead archived',
        description: 'Lead has been archived successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error archiving lead',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useRestoreLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => leadsApi.restoreLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['archived-leads'] });
      toast({
        title: 'Lead restored',
        description: 'Lead has been restored successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error restoring lead',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const usePermanentlyDeleteLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => leadsApi.permanentlyDeleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['archived-leads'] });
      toast({
        title: 'Lead permanently deleted',
        description: 'Lead has been permanently removed.',
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

export const useArchivedLeads = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['archived-leads', page, limit],
    queryFn: () => leadsApi.getArchivedLeads(page, limit),
    staleTime: 5 * 60 * 1000,
  });
};

export const useAssignLead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { profile } = useProfile();

  return useMutation({
    mutationFn: ({ leadId, assignedTo, previousAssigneeId }: { leadId: string; assignedTo: string | null; previousAssigneeId?: string | null }) =>
      leadsApi.assignLead(leadId, assignedTo),
    onSuccess: (updatedLead, { previousAssigneeId }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', updatedLead.id] });
      toast({
        title: 'Lead assigned',
        description: `Lead has been ${updatedLead.assigned_to ? 'assigned' : 'unassigned'} successfully.`,
      });
      if (user?.id && updatedLead.assigned_to) {
        notify.leadAssigned({
          actorId: user.id,
          actorName: profile?.full_name || 'Someone',
          lead: { id: updatedLead.id, book_title: updatedLead.book_title },
          newAssigneeId: updatedLead.assigned_to,
          previousAssigneeId: previousAssigneeId || null,
        });
      }
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
  const { user } = useAuth();
  const { profile } = useProfile();
  const { users } = useUsersContext();

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
      if (user?.id) {
        const statusName = updatedLead.status?.name || '';
        const terminalStatuses = ['closed won', 'closed lost', 'dead lead'];
        const isTerminal = terminalStatuses.some(s => statusName.toLowerCase().includes(s.toLowerCase()));
        notify.leadStatusChanged({
          actorId: user.id,
          actorName: profile?.full_name || 'Someone',
          lead: { id: updatedLead.id, book_title: updatedLead.book_title, assigned_to: updatedLead.assigned_to },
          newStatusName: statusName,
          isTerminal,
          managers: getManagers(users),
        });
      }
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

export const usePinLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, pin }: { leadId: string; pin: boolean }) => {
      if (pin) {
        const pinnedCount = await leadsApi.getPinnedLeadsCount();
        if (pinnedCount >= 10) {
          throw new Error('Maximum of 10 pinned leads reached. Unpin a lead first.');
        }
        return leadsApi.pinLead(leadId);
      } else {
        return leadsApi.unpinLead(leadId);
      }
    },
    onSuccess: (updatedLead) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', updatedLead.id] });
      toast({
        title: updatedLead.is_pinned ? 'Lead pinned' : 'Lead unpinned',
        description: updatedLead.is_pinned
          ? 'Lead will appear at the top of the list.'
          : 'Lead has been unpinned.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating pin status',
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