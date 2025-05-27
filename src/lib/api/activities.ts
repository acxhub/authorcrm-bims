import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type Activity = Database['public']['Tables']['activity_logs']['Row'] & {
  user_profile?: Database['public']['Tables']['profiles']['Row'];
};

export type CreateActivityData = Database['public']['Tables']['activity_logs']['Insert'];
export type UpdateActivityData = Database['public']['Tables']['activity_logs']['Update'];

// Activity types enum
export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'status_change' | 'assignment';

// Get activities for a deal (via lead_id)
export const getActivitiesByLeadId = async (leadId: string): Promise<Activity[]> => {
  const { data, error } = await supabase
    .from('activity_logs')
    .select(`
      *,
      user_profile:profiles!activity_logs_user_id_fkey(*)
    `)
    .eq('lead_id', leadId)
    .order('activity_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Create a new activity
export const createActivity = async (data: CreateActivityData): Promise<Activity> => {
  const { data: activity, error } = await supabase
    .from('activity_logs')
    .insert(data)
    .select(`
      *,
      user_profile:profiles!activity_logs_user_id_fkey(*)
    `)
    .single();

  if (error) throw error;
  return activity;
};

// Update an activity
export const updateActivity = async (id: string, data: UpdateActivityData): Promise<Activity> => {
  const { data: activity, error } = await supabase
    .from('activity_logs')
    .update(data)
    .eq('id', id)
    .select(`
      *,
      user_profile:profiles!activity_logs_user_id_fkey(*)
    `)
    .single();

  if (error) throw error;
  return activity;
};

// Delete an activity
export const deleteActivity = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('activity_logs')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Log a quick activity (helper function)
export const logActivity = async (
  leadId: string,
  userId: string,
  activityType: ActivityType,
  summary: string,
  outcome?: string
): Promise<Activity> => {
  return createActivity({
    lead_id: leadId,
    user_id: userId,
    activity_type: activityType,
    summary,
    outcome,
    activity_date: new Date().toISOString(),
  });
};

export class ActivitiesAPI {
  async getActivities(leadId?: string, limit = 50): Promise<Activity[]> {
    let query = supabase
      .from('activity_logs')
      .select(`
        *,
        user_profile:profiles!activity_logs_user_id_fkey(*)
      `)
      .order('activity_date', { ascending: false })
      .limit(limit);

    if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch activities: ${error.message}`);
    }

    return data || [];
  }

  async getActivityById(id: string): Promise<Activity> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        user_profile:profiles!activity_logs_user_id_fkey(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch activity: ${error.message}`);
    }

    return data;
  }

  async getRecentActivities(days = 7): Promise<Activity[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        user_profile:profiles!activity_logs_user_id_fkey(*)
      `)
      .gte('activity_date', cutoffDate.toISOString())
      .order('activity_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch recent activities: ${error.message}`);
    }

    return data || [];
  }

  async getActivityStats(leadId?: string): Promise<{
    totalActivities: number;
    activitiesByType: Record<string, number>;
    recentActivityCount: number;
  }> {
    let query = supabase
      .from('activity_logs')
      .select('activity_type, activity_date');

    if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch activity stats: ${error.message}`);
    }

    const activities = data || [];
    const totalActivities = activities.length;

    // Count by type
    const activitiesByType = activities.reduce((acc, activity) => {
      const type = activity.activity_type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count recent activities (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentActivityCount = activities.filter(
      activity => new Date(activity.activity_date) >= sevenDaysAgo
    ).length;

    return {
      totalActivities,
      activitiesByType,
      recentActivityCount,
    };
  }
}

export const activitiesApi = new ActivitiesAPI(); 