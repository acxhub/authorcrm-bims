import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActivitiesByLeadId, createActivity, updateActivity, archiveActivity, restoreActivity, permanentlyDeleteActivity, logActivity, activitiesApi } from '@/lib/api/activities';
import type { CreateActivityData, UpdateActivityData, ActivityType } from '@/lib/api/activities';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useProfile } from '@/hooks/useAuth';
import { useUsersContext } from '@/contexts/UsersContext';
import { notify, getManagers } from '@/lib/notifications/notify';

// Query keys
export const activityKeys = {
  all: ['activities'] as const,
  byLeadId: (leadId: string) => [...activityKeys.all, 'lead', leadId] as const,
};

// Get activities by lead ID
export const useActivitiesByLeadId = (leadId: string) => {
  return useQuery({
    queryKey: activityKeys.byLeadId(leadId),
    queryFn: () => getActivitiesByLeadId(leadId),
    enabled: !!leadId,
    staleTime: 2 * 60 * 1000, // 2 minutes (activities change frequently)
  });
};

// Create activity mutation
export const useCreateActivity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createActivity,
    onSuccess: (newActivity) => {
      // Invalidate and refetch activities for this lead
      queryClient.invalidateQueries({
        queryKey: activityKeys.byLeadId(newActivity.lead_id),
      });
      
      toast({
        title: 'Success',
        description: 'Activity logged successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to log activity',
        variant: 'destructive',
      });
    },
  });
};

// Update activity mutation
export const useUpdateActivity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateActivityData }) =>
      updateActivity(id, data),
    onSuccess: (updatedActivity) => {
      // Invalidate and refetch activities for this lead
      queryClient.invalidateQueries({
        queryKey: activityKeys.byLeadId(updatedActivity.lead_id),
      });
      
      toast({
        title: 'Success',
        description: 'Activity updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update activity',
        variant: 'destructive',
      });
    },
  });
};

// Archive activity mutation (soft delete)
export const useArchiveActivity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, deletedBy }: { id: string; deletedBy: string }) =>
      archiveActivity(id, deletedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
      queryClient.invalidateQueries({ queryKey: ['archived-activities'] });
      toast({ title: 'Success', description: 'Activity archived successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to archive activity', variant: 'destructive' });
    },
  });
};

// Restore activity mutation
export const useRestoreActivity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => restoreActivity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
      queryClient.invalidateQueries({ queryKey: ['archived-activities'] });
      toast({ title: 'Success', description: 'Activity restored successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to restore activity', variant: 'destructive' });
    },
  });
};

// Permanently delete activity mutation
export const usePermanentlyDeleteActivity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => permanentlyDeleteActivity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
      queryClient.invalidateQueries({ queryKey: ['archived-activities'] });
      toast({ title: 'Success', description: 'Activity permanently deleted' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete activity', variant: 'destructive' });
    },
  });
};

// Archived activities query
export const useArchivedActivities = (limit = 50) => {
  return useQuery({
    queryKey: ['archived-activities', limit],
    queryFn: () => activitiesApi.getArchivedActivities(limit),
    staleTime: 2 * 60 * 1000,
  });
};

// Log activity mutation (helper)
export const useLogActivity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { users } = useUsersContext();

  return useMutation({
    mutationFn: (params: {
      leadId: string;
      userId: string;
      activityType: ActivityType;
      summary: string;
      outcome?: string;
      leadContext?: { book_title?: string; assigned_to?: string | null };
    }) => logActivity(params.leadId, params.userId, params.activityType, params.summary, params.outcome),
    onSuccess: (newActivity, { activityType, leadContext }) => {
      // Invalidate and refetch activities for this lead
      queryClient.invalidateQueries({
        queryKey: activityKeys.byLeadId(newActivity.lead_id),
      });

      toast({
        title: 'Success',
        description: 'Activity logged successfully',
      });

      if (user?.id && leadContext) {
        notify.activityLogged({
          actorId: user.id,
          actorName: profile?.full_name || 'Someone',
          lead: { id: newActivity.lead_id, book_title: leadContext.book_title, assigned_to: leadContext.assigned_to },
          activityType,
          managers: getManagers(users),
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to log activity',
        variant: 'destructive',
      });
    },
  });
}; 