import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { statusesApi, type CreateStatusRequest, type UpdateStatusRequest } from '@/lib/api/statuses';
import { useToast } from '@/hooks/use-toast';

export const useStatuses = () => {
  return useQuery({
    queryKey: ['statuses'],
    queryFn: () => statusesApi.getStatuses(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useStatus = (id: string) => {
  return useQuery({
    queryKey: ['status', id],
    queryFn: () => statusesApi.getStatusById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes (statuses rarely change)
  });
};

export const useCreateStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateStatusRequest) => statusesApi.createStatus(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
      toast({
        title: 'Status created',
        description: 'New status has been successfully created.',
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

export const useUpdateStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStatusRequest }) =>
      statusesApi.updateStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast({
        title: 'Status updated',
        description: 'Status has been successfully updated.',
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

export const useArchiveStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, deletedBy }: { id: string; deletedBy: string }) =>
      statusesApi.archiveStatus(id, deletedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
      queryClient.invalidateQueries({ queryKey: ['archived-statuses'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast({
        title: 'Status archived',
        description: 'Status has been successfully archived.',
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

export const useRestoreStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => statusesApi.restoreStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
      queryClient.invalidateQueries({ queryKey: ['archived-statuses'] });
      toast({
        title: 'Status restored',
        description: 'Status has been successfully restored.',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const usePermanentlyDeleteStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => statusesApi.permanentlyDeleteStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
      queryClient.invalidateQueries({ queryKey: ['archived-statuses'] });
      toast({
        title: 'Status permanently deleted',
        description: 'Status has been permanently removed.',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useArchivedStatuses = () => {
  return useQuery({
    queryKey: ['archived-statuses'],
    queryFn: () => statusesApi.getArchivedStatuses(),
    staleTime: 10 * 60 * 1000,
  });
};

export const useReorderStatuses = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (statusUpdates: { id: string; order_index: number }[]) =>
      statusesApi.reorderStatuses(statusUpdates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
      toast({
        title: 'Statuses reordered',
        description: 'Status order has been successfully updated.',
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

export const useCreateDefaultStatuses = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => statusesApi.createDefaultStatuses(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
      toast({
        title: 'Default statuses created',
        description: 'Default pipeline statuses have been successfully created.',
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