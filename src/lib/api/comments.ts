import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Comment = Tables<'comments'>;
export type CreateCommentRequest = Omit<TablesInsert<'comments'>, 'id' | 'created_at' | 'updated_at' | 'user_id'>;
export type UpdateCommentRequest = Partial<Omit<TablesUpdate<'comments'>, 'id' | 'created_at' | 'updated_at'>>;

export type CommentWithProfile = Comment & {
  user_profile: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url?: string | null;
  };
  replies?: CommentWithProfile[];
};

export class CommentsAPI {
  async getComments(leadId: string): Promise<CommentWithProfile[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user_profile:profiles!comments_user_id_fkey(
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('lead_id', leadId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch comments: ${error.message}`);
    }

    // Fetch replies for each comment
    const commentsWithReplies = await Promise.all(
      (data || []).map(async (comment) => {
        const replies = await this.getReplies(comment.id);
        return {
          ...comment,
          replies,
        };
      })
    );

    return commentsWithReplies;
  }

  async getReplies(parentCommentId: string): Promise<CommentWithProfile[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user_profile:profiles!comments_user_id_fkey(
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('parent_comment_id', parentCommentId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch replies: ${error.message}`);
    }

    return data || [];
  }

  async getCommentById(id: string): Promise<CommentWithProfile> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user_profile:profiles!comments_user_id_fkey(
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch comment: ${error.message}`);
    }

    return data;
  }

  async createComment(commentData: CreateCommentRequest): Promise<Comment> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        ...commentData,
        user_id: user.id,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create comment: ${error.message}`);
    }

    return data;
  }

  async updateComment(id: string, updates: UpdateCommentRequest): Promise<Comment> {
    const { data, error } = await supabase
      .from('comments')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update comment: ${error.message}`);
    }

    return data;
  }

  async deleteComment(id: string): Promise<void> {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete comment: ${error.message}`);
    }
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