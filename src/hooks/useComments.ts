import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsApi, type CreateCommentRequest, type UpdateCommentRequest } from '@/lib/api/comments';
import { useToast } from '@/hooks/use-toast';

export const useComments = (leadId: string) => {
  return useQuery({
    queryKey: ['comments', leadId],
    queryFn: () => commentsApi.getComments(leadId),
    enabled: !!leadId,
  });
};

export const useComment = (id: string) => {
  return useQuery({
    queryKey: ['comment', id],
    queryFn: () => commentsApi.getCommentById(id),
    enabled: !!id,
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateCommentRequest) => commentsApi.createComment(data),
    onSuccess: (newComment) => {
      // Invalidate comments queries
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      
      // Optionally update specific lead comments
      if (newComment.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['comments', newComment.lead_id] });
      }
      
      toast({
        title: 'Comment added',
        description: 'Your comment has been successfully posted.',
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

export const useUpdateComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCommentRequest }) =>
      commentsApi.updateComment(id, data),
    onSuccess: (updatedComment) => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      queryClient.invalidateQueries({ queryKey: ['comment', updatedComment.id] });
      
      if (updatedComment.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['comments', updatedComment.lead_id] });
      }
      
      toast({
        title: 'Comment updated',
        description: 'Your comment has been successfully updated.',
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

export const useDeleteComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => commentsApi.deleteComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      
      toast({
        title: 'Comment deleted',
        description: 'The comment has been successfully deleted.',
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

export const useCommentStats = (leadId?: string) => {
  return useQuery({
    queryKey: ['comment-stats', leadId],
    queryFn: () => commentsApi.getCommentStats(leadId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}; 