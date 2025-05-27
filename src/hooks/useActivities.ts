import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActivitiesByLeadId, createActivity, updateActivity, deleteActivity, logActivity } from '@/lib/api/activities';
import type { CreateActivityData, UpdateActivityData, ActivityType } from '@/lib/api/activities';
import { useToast } from '@/hooks/use-toast';

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

// Delete activity mutation
export const useDeleteActivity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteActivity,
    onSuccess: (_, deletedId) => {
      // Invalidate all activity queries since we don't know which lead this belonged to
      queryClient.invalidateQueries({
        queryKey: activityKeys.all,
      });
      
      toast({
        title: 'Success',
        description: 'Activity deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete activity',
        variant: 'destructive',
      });
    },
  });
};

// Log activity mutation (helper)
export const useLogActivity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ leadId, userId, activityType, summary, outcome }: {
      leadId: string;
      userId: string;
      activityType: ActivityType;
      summary: string;
      outcome?: string;
    }) => logActivity(leadId, userId, activityType, summary, outcome),
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