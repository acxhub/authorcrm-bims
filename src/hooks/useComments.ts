import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCommentsByLeadId, createComment, updateComment, deleteComment } from '@/lib/api/comments';
import type { CreateCommentData, UpdateCommentData } from '@/lib/api/comments';
import { useToast } from '@/hooks/use-toast';

// Query keys
export const commentKeys = {
  all: ['comments'] as const,
  byLeadId: (leadId: string) => [...commentKeys.all, 'lead', leadId] as const,
};

// Get comments by lead ID
export const useCommentsByLeadId = (leadId: string) => {
  return useQuery({
    queryKey: commentKeys.byLeadId(leadId),
    queryFn: () => getCommentsByLeadId(leadId),
    enabled: !!leadId,
    staleTime: 2 * 60 * 1000, // 2 minutes (comments change frequently)
  });
};

// Create comment mutation
export const useCreateComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createComment,
    onSuccess: (newComment) => {
      // Invalidate and refetch comments for this lead
      queryClient.invalidateQueries({
        queryKey: commentKeys.byLeadId(newComment.lead_id),
      });
      
      toast({
        title: 'Success',
        description: 'Comment added successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      });
    },
  });
};

// Update comment mutation
export const useUpdateComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCommentData }) =>
      updateComment(id, data),
    onSuccess: (updatedComment) => {
      // Invalidate and refetch comments for this lead
      queryClient.invalidateQueries({
        queryKey: commentKeys.byLeadId(updatedComment.lead_id),
      });
      
      toast({
        title: 'Success',
        description: 'Comment updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update comment',
        variant: 'destructive',
      });
    },
  });
};

// Delete comment mutation
export const useDeleteComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteComment,
    onSuccess: (_, deletedId) => {
      // Invalidate all comment queries since we don't know which lead this belonged to
      queryClient.invalidateQueries({
        queryKey: commentKeys.all,
      });
      
      toast({
        title: 'Success',
        description: 'Comment deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete comment',
        variant: 'destructive',
      });
    },
  });
}; 