import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type Comment = Database['public']['Tables']['comments']['Row'] & {
  user_profile?: Database['public']['Tables']['profiles']['Row'];
  replies?: Comment[];
};

export type CreateCommentData = Database['public']['Tables']['comments']['Insert'];
export type UpdateCommentData = Database['public']['Tables']['comments']['Update'];

// Get comments for a deal (via lead_id)
export const getCommentsByLeadId = async (leadId: string): Promise<Comment[]> => {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      user_profile:profiles!comments_user_id_fkey(*)
    `)
    .eq('lead_id', leadId)
    .is('parent_comment_id', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Get replies for each comment
  const commentsWithReplies = await Promise.all(
    data.map(async (comment) => {
      const { data: replies, error: repliesError } = await supabase
        .from('comments')
        .select(`
          *,
          user_profile:profiles!comments_user_id_fkey(*)
        `)
        .eq('parent_comment_id', comment.id)
        .order('created_at', { ascending: true });

      if (repliesError) throw repliesError;

      return {
        ...comment,
        replies: replies || []
      };
    })
  );

  return commentsWithReplies;
};

// Create a new comment
export const createComment = async (data: CreateCommentData): Promise<Comment> => {
  const { data: comment, error } = await supabase
    .from('comments')
    .insert(data)
    .select(`
      *,
      user_profile:profiles!comments_user_id_fkey(*)
    `)
    .single();

  if (error) throw error;
  return comment;
};

// Update a comment
export const updateComment = async (id: string, data: UpdateCommentData): Promise<Comment> => {
  const { data: comment, error } = await supabase
    .from('comments')
    .update(data)
    .eq('id', id)
    .select(`
      *,
      user_profile:profiles!comments_user_id_fkey(*)
    `)
    .single();

  if (error) throw error;
  return comment;
};

// Delete a comment
export const deleteComment = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export class CommentsAPI {
  async getComments(leadId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user_profile:profiles!comments_user_id_fkey(*)
      `)
      .eq('lead_id', leadId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch comments: ${error.message}`);
    }

    // Fetch replies for each comment
    const commentsWithReplies = await Promise.all(
      data.map(async (comment) => {
        const replies = await this.getReplies(comment.id);
        return {
          ...comment,
          replies,
        };
      })
    );

    return commentsWithReplies;
  }

  async getReplies(parentCommentId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user_profile:profiles!comments_user_id_fkey(*)
      `)
      .eq('parent_comment_id', parentCommentId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch replies: ${error.message}`);
    }

    return data || [];
  }

  async getCommentById(id: string): Promise<Comment> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user_profile:profiles!comments_user_id_fkey(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch comment: ${error.message}`);
    }

    return data;
  }

  async getCommentStats(leadId?: string): Promise<{
    totalComments: number;
    recentCommentCount: number;
  }> {
    let query = supabase
      .from('comments')
      .select('created_at');

    if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch comment stats: ${error.message}`);
    }

    const comments = data || [];
    const totalComments = comments.length;

    // Count recent comments (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCommentCount = comments.filter(
      comment => new Date(comment.created_at!) >= sevenDaysAgo
    ).length;

    return {
      totalComments,
      recentCommentCount,
    };
  }
}

export const commentsApi = new CommentsAPI(); 