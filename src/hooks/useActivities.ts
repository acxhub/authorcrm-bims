import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activitiesApi, type CreateActivityRequest, type UpdateActivityRequest, type ActivityWithProfile } from '@/lib/api/activities';
import { useToast } from '@/hooks/use-toast';

export const useActivities = (leadId?: string, limit = 50) => {
  return useQuery({
    queryKey: ['activities', leadId, limit],
    queryFn: () => activitiesApi.getActivities(leadId, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useActivity = (id: string) => {
  return useQuery({
    queryKey: ['activity', id],
    queryFn: () => activitiesApi.getActivityById(id),
    enabled: !!id,
  });
};

export const useCreateActivity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateActivityRequest) => activitiesApi.createActivity(data),
    onSuccess: (newActivity) => {
      // Invalidate activities queries
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      
      // Optionally update specific lead activities
      if (newActivity.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['activities', newActivity.lead_id] });
      }
      
      toast({
        title: 'Activity logged',
        description: 'Activity has been successfully recorded.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateActivity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateActivityRequest }) =>
      activitiesApi.updateActivity(id, data),
    onSuccess: (updatedActivity) => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['activity', updatedActivity.id] });
      
      if (updatedActivity.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['activities', updatedActivity.lead_id] });
      }
      
      toast({
        title: 'Activity updated',
        description: 'Activity has been successfully updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteActivity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => activitiesApi.deleteActivity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast({
        title: 'Activity deleted',
        description: 'Activity has been successfully deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useRecentActivities = (days = 7) => {
  return useQuery({
    queryKey: ['activities', 'recent', days],
    queryFn: () => activitiesApi.getRecentActivities(days),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useActivityStats = (leadId?: string) => {
  return useQuery({
    queryKey: ['activities', 'stats', leadId],
    queryFn: () => activitiesApi.getActivityStats(leadId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Helper hooks for common activity types
export const useLogCall = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ leadId, summary, outcome }: { leadId: string; summary: string; outcome?: string }) =>
      activitiesApi.logCall(leadId, summary, outcome),
    onSuccess: (newActivity) => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      if (newActivity.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['activities', newActivity.lead_id] });
      }
      toast({
        title: 'Call logged',
        description: 'Call activity has been successfully recorded.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useLogEmail = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ leadId, summary, outcome }: { leadId: string; summary: string; outcome?: string }) =>
      activitiesApi.logEmail(leadId, summary, outcome),
    onSuccess: (newActivity) => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      if (newActivity.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['activities', newActivity.lead_id] });
      }
      toast({
        title: 'Email logged',
        description: 'Email activity has been successfully recorded.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useLogMeeting = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ leadId, summary, outcome }: { leadId: string; summary: string; outcome?: string }) =>
      activitiesApi.logMeeting(leadId, summary, outcome),
    onSuccess: (newActivity) => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      if (newActivity.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['activities', newActivity.lead_id] });
      }
      toast({
        title: 'Meeting logged',
        description: 'Meeting activity has been successfully recorded.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useLogNote = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ leadId, summary }: { leadId: string; summary: string }) =>
      activitiesApi.logNote(leadId, summary),
    onSuccess: (newActivity) => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      if (newActivity.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['activities', newActivity.lead_id] });
      }
      toast({
        title: 'Note logged',
        description: 'Note has been successfully recorded.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}; 