import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCommentsByLeadId, createComment, updateComment, archiveComment, restoreComment, permanentlyDeleteComment, commentsApi } from '@/lib/api/comments';
import type { CreateCommentData, UpdateCommentData } from '@/lib/api/comments';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useProfile } from '@/hooks/useAuth';
import { notify } from '@/lib/notifications/notify';

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

// Create comment mutation - accepts optional notifyContext for lead info
export const useCreateComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile();

  return useMutation({
    mutationFn: (params: { data: CreateCommentData; leadContext?: { book_title?: string; assigned_to?: string | null }; parentCommentUserId?: string | null }) =>
      createComment(params.data),
    onSuccess: (newComment, { leadContext, parentCommentUserId }) => {
      queryClient.invalidateQueries({
        queryKey: commentKeys.byLeadId(newComment.lead_id),
      });

      toast({
        title: 'Success',
        description: 'Comment added successfully',
      });

      if (user?.id && leadContext) {
        notify.commentAdded({
          actorId: user.id,
          actorName: profile?.full_name || 'Someone',
          lead: { id: newComment.lead_id, book_title: leadContext.book_title, assigned_to: leadContext.assigned_to },
          isReply: !!newComment.parent_comment_id,
          parentCommentUserId: parentCommentUserId || null,
        });
      }
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

// Archive comment mutation (soft delete)
export const useArchiveComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, deletedBy }: { id: string; deletedBy: string }) =>
      archiveComment(id, deletedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.all });
      queryClient.invalidateQueries({ queryKey: ['archived-comments'] });
      toast({ title: 'Success', description: 'Comment archived successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to archive comment', variant: 'destructive' });
    },
  });
};

// Restore comment mutation
export const useRestoreComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => restoreComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.all });
      queryClient.invalidateQueries({ queryKey: ['archived-comments'] });
      toast({ title: 'Success', description: 'Comment restored successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to restore comment', variant: 'destructive' });
    },
  });
};

// Permanently delete comment mutation
export const usePermanentlyDeleteComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => permanentlyDeleteComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.all });
      queryClient.invalidateQueries({ queryKey: ['archived-comments'] });
      toast({ title: 'Success', description: 'Comment permanently deleted' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete comment', variant: 'destructive' });
    },
  });
};

// Archived comments query
export const useArchivedComments = (limit = 50) => {
  return useQuery({
    queryKey: ['archived-comments', limit],
    queryFn: () => commentsApi.getArchivedComments(limit),
    staleTime: 2 * 60 * 1000,
  });
}; 