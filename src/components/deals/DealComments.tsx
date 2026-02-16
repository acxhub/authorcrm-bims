import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Send, Edit, Trash2, Reply, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCommentsByLeadId, useCreateComment, useUpdateComment, useArchiveComment } from '@/hooks/useComments';
import { useAuth, useProfile } from '@/hooks/useAuth';
import type { Comment } from '@/lib/api/comments';

interface DealCommentsProps {
  leadId: string;
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const DealComments: React.FC<DealCommentsProps> = ({ leadId }) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const { data: comments, isLoading } = useCommentsByLeadId(leadId);
  const createCommentMutation = useCreateComment();
  const updateCommentMutation = useUpdateComment();
  const archiveCommentMutation = useArchiveComment();

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    try {
      await createCommentMutation.mutateAsync({
        data: {
          lead_id: leadId,
          user_id: user.id,
          content: newComment.trim(),
          parent_comment_id: null,
        },
      });
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      await updateCommentMutation.mutateAsync({
        id: commentId,
        data: { content: editContent.trim() },
      });
      setEditingComment(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  const handleArchiveComment = async (commentId: string) => {
    try {
      await archiveCommentMutation.mutateAsync({ id: commentId, deletedBy: user?.id || '' });
    } catch (error) {
      console.error('Failed to archive comment:', error);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim() || !user) return;

    try {
      // Find the parent comment's user_id for reply notification
      const parentComment = comments?.find(c => c.id === parentId);
      const parentUserId = parentComment?.user_id ||
        comments?.flatMap(c => c.replies || []).find(r => r.id === parentId)?.user_id || null;

      await createCommentMutation.mutateAsync({
        data: {
          lead_id: leadId,
          user_id: user.id,
          content: replyContent.trim(),
          parent_comment_id: parentId,
        },
        parentCommentUserId: parentUserId,
      });
      setReplyingTo(null);
      setReplyContent('');
    } catch (error) {
      console.error('Failed to add reply:', error);
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setEditContent('');
  };

  const startReply = (commentId: string) => {
    setReplyingTo(commentId);
    setReplyContent('');
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyContent('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Loading comments...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Comments ({comments?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new comment */}
        <div className="space-y-3">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value.slice(0, 1000))}
            className="min-h-[80px]"
            maxLength={1000}
          />
          <div className="text-xs text-gray-500 text-right">
            {newComment.length}/1000 characters
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim() || createCommentMutation.isPending}
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              {createCommentMutation.isPending ? 'Adding...' : 'Add Comment'}
            </Button>
          </div>
        </div>

        {/* Comments list */}
        {comments && comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="space-y-3">
                {/* Main comment */}
                <div className="flex gap-3 p-4 bg-gray-50 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.user_profile?.avatar_url || ''} />
                    <AvatarFallback>
                      {getInitials(comment.user_profile?.full_name || 'Unknown')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {comment.user_profile?.full_name || 'Unknown User'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(comment.created_at!), { addSuffix: true })}
                        </span>
                        {comment.updated_at !== comment.created_at && (
                          <span className="text-xs text-gray-400">(edited)</span>
                        )}
                      </div>
                      
                      {user?.id === comment.user_id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => startEdit(comment)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {profile?.role !== 'sales' && (
                              <DropdownMenuItem 
                                onClick={() => handleArchiveComment(comment.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    
                    {editingComment === comment.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value.slice(0, 1000))}
                          className="min-h-[60px]"
                          maxLength={1000}
                        />
                        <div className="text-xs text-gray-500 text-right">
                          {editContent.length}/1000 characters
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleEditComment(comment.id)}
                            disabled={updateCommentMutation.isPending}
                          >
                            {updateCommentMutation.isPending ? 'Saving...' : 'Save'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-700">{comment.content}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startReply(comment.id)}
                          className="text-xs"
                        >
                          <Reply className="h-3 w-3 mr-1" />
                          Reply
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Reply form */}
                {replyingTo === comment.id && (
                  <div className="ml-11 space-y-2">
                    <Textarea
                      placeholder="Write a reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value.slice(0, 1000))}
                      className="min-h-[60px]"
                      maxLength={1000}
                    />
                    <div className="text-xs text-gray-500 text-right">
                      {replyContent.length}/1000 characters
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleReply(comment.id)}
                        disabled={!replyContent.trim() || createCommentMutation.isPending}
                      >
                        {createCommentMutation.isPending ? 'Replying...' : 'Reply'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelReply}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-11 space-y-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3 p-3 bg-white border rounded-lg">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={reply.user_profile?.avatar_url || ''} />
                          <AvatarFallback className="text-xs">
                            {getInitials(reply.user_profile?.full_name || 'Unknown')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-xs">
                                {reply.user_profile?.full_name || 'Unknown User'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(reply.created_at!), { addSuffix: true })}
                              </span>
                            </div>
                            
                            {user?.id === reply.user_id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => startEdit(reply)}>
                                    <Edit className="h-3 w-3 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  {profile?.role !== 'sales' && (
                                    <DropdownMenuItem 
                                      onClick={() => handleArchiveComment(reply.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-3 w-3 mr-2" />
                                      Archive
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          
                          {editingComment === reply.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value.slice(0, 1000))}
                                className="min-h-[50px] text-xs"
                                maxLength={1000}
                              />
                              <div className="text-xs text-gray-500 text-right">
                                {editContent.length}/1000 characters
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleEditComment(reply.id)}
                                  disabled={updateCommentMutation.isPending}
                                >
                                  {updateCommentMutation.isPending ? 'Saving...' : 'Save'}
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEdit}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-700">{reply.content}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No comments yet</p>
            <p className="text-sm">Start a conversation about this deal</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 