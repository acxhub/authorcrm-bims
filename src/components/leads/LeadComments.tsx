import React, { useState } from 'react';
import { MessageCircle, Send, Reply, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useComments, useCreateComment, useUpdateComment, useDeleteComment } from '@/hooks/useComments';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import type { Lead } from '@/lib/api/leads';
import type { CommentWithProfile } from '@/lib/api/comments';

interface LeadCommentsProps {
  lead: Lead;
}

interface CommentItemProps {
  comment: CommentWithProfile;
  leadId: string;
  onReply: (parentId: string) => void;
  level?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({ 
  comment, 
  leadId, 
  onReply, 
  level = 0 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  
  const { user } = useAuth();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();

  const isOwner = user?.id === comment.user_id;
  const maxLevel = 2; // Limit nesting depth

  const handleEdit = async () => {
    if (editContent.trim() === comment.content) {
      setIsEditing(false);
      return;
    }

    try {
      await updateComment.mutateAsync({
        id: comment.id,
        data: { content: editContent.trim() }
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this comment?')) {
      try {
        await deleteComment.mutateAsync(comment.id);
      } catch (error) {
        console.error('Failed to delete comment:', error);
      }
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`space-y-3 ${level > 0 ? 'ml-8 pl-4 border-l-2 border-gray-200' : ''}`}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={comment.user_profile.avatar_url || ''} />
          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
            {getInitials(comment.user_profile.full_name || 'U')}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-2">
          {/* Comment Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {comment.user_profile.full_name || 'Unknown User'}
              </span>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.created_at!), { addSuffix: true })}
              </span>
              {comment.updated_at !== comment.created_at && (
                <span className="text-xs text-gray-400">(edited)</span>
              )}
            </div>
            
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit className="h-3 w-3 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-red-600"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Comment Content */}
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px]"
                placeholder="Edit your comment..."
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleEdit}
                  disabled={updateComment.isPending || !editContent.trim()}
                >
                  {updateComment.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-sm text-gray-900 whitespace-pre-wrap">
                {comment.content}
              </div>
              
              {/* Comment Actions */}
              {level < maxLevel && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => onReply(comment.id)}
                  >
                    <Reply className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              leadId={leadId}
              onReply={onReply}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const LeadComments: React.FC<LeadCommentsProps> = ({ lead }) => {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const { user } = useAuth();
  const { data: comments, isLoading } = useComments(lead.id);
  const createComment = useCreateComment();

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      await createComment.mutateAsync({
        lead_id: lead.id,
        content: newComment.trim(),
        parent_comment_id: null,
      });
      setNewComment('');
    } catch (error) {
      console.error('Failed to create comment:', error);
    }
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !replyingTo) return;

    try {
      await createComment.mutateAsync({
        lead_id: lead.id,
        content: replyContent.trim(),
        parent_comment_id: replyingTo,
      });
      setReplyContent('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to create reply:', error);
    }
  };

  const handleReply = (parentId: string) => {
    setReplyingTo(parentId);
    setReplyContent('');
  };

  const isSubmitting = createComment.isPending;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Comments ({comments?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New Comment Form */}
        <div className="space-y-3">
          <Label htmlFor="new-comment">Add a comment</Label>
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={user?.user_metadata?.avatar_url || ''} />
              <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                {user?.user_metadata?.full_name ? 
                  user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 
                  'U'
                }
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                id="new-comment"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                  size="sm"
                >
                  {isSubmitting ? 'Posting...' : (
                    <>
                      <Send className="h-3 w-3 mr-2" />
                      Post Comment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Loading comments...
            </div>
          ) : comments?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-4 pr-4">
                {comments?.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    leadId={lead.id}
                    onReply={handleReply}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Reply Form */}
        {replyingTo && (
          <div className="ml-11 space-y-2 p-3 bg-gray-50 rounded-lg">
            <Label>Replying to comment</Label>
            <Textarea
              placeholder="Write your reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubmitReply}
                disabled={!replyContent.trim() || isSubmitting}
              >
                {isSubmitting ? 'Posting...' : 'Post Reply'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyContent('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 