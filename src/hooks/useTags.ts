import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsApi, type CreateTagRequest, type UpdateTagRequest } from '@/lib/api/tags';
import { useToast } from '@/hooks/use-toast';

export const useTags = () => {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsApi.getTags(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useTag = (id: string) => {
  return useQuery({
    queryKey: ['tag', id],
    queryFn: () => tagsApi.getTagById(id),
    enabled: !!id,
  });
};

export const useCreateTag = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateTagRequest) => tagsApi.createTag(data),
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({
        title: 'Tag created',
        description: `Tag "${newTag.name}" has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating tag',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateTag = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTagRequest }) =>
      tagsApi.updateTag(id, data),
    onSuccess: (updatedTag) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['tag', updatedTag.id] });
      toast({
        title: 'Tag updated',
        description: `Tag "${updatedTag.name}" has been updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating tag',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteTag = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => tagsApi.deleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({
        title: 'Tag deleted',
        description: 'Tag has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting tag',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteAllTags = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => tagsApi.deleteAllTags(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({
        title: 'All tags deleted',
        description: 'All existing tags have been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting tags',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useInitializePredefinedTags = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => tagsApi.initializePredefinedTags(),
    onSuccess: (tags) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({
        title: 'Tags initialized',
        description: `${tags.length} predefined tags are now available.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error initializing tags',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useTagStats = () => {
  return useQuery({
    queryKey: ['tag-stats'],
    queryFn: () => tagsApi.getTagStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}; 