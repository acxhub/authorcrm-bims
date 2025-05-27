import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Activity = Tables<'activity_logs'>;
export type CreateActivityRequest = Omit<TablesInsert<'activity_logs'>, 'id' | 'created_at' | 'updated_at' | 'user_id'>;
export type UpdateActivityRequest = Partial<Omit<TablesUpdate<'activity_logs'>, 'id' | 'created_at' | 'updated_at'>>;

// Activity types based on database schema
export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'status_change' | 'assignment';

export interface ActivityWithProfile extends Activity {
  user_profile: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
}

export class ActivitiesAPI {
  async getActivities(leadId?: string, limit = 50): Promise<ActivityWithProfile[]> {
    let query = supabase
      .from('activity_logs')
      .select(`
        *,
        user_profile:profiles!activity_logs_user_id_fkey(
          id,
          full_name,
          email
        )
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

  async getActivityById(id: string): Promise<ActivityWithProfile> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        user_profile:profiles!activity_logs_user_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch activity: ${error.message}`);
    }

    return data;
  }

  async createActivity(activityData: CreateActivityRequest): Promise<Activity> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        ...activityData,
        user_id: user.id,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create activity: ${error.message}`);
    }

    return data;
  }

  async updateActivity(id: string, updates: UpdateActivityRequest): Promise<Activity> {
    const { data, error } = await supabase
      .from('activity_logs')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update activity: ${error.message}`);
    }

    return data;
  }

  async deleteActivity(id: string): Promise<void> {
    const { error } = await supabase
      .from('activity_logs')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete activity: ${error.message}`);
    }
  }

  // Helper methods for common activity types
  async logCall(leadId: string, summary: string, outcome?: string): Promise<Activity> {
    return this.createActivity({
      lead_id: leadId,
      activity_type: 'call',
      activity_date: new Date().toISOString(),
      summary,
      outcome: outcome || null,
    });
  }

  async logEmail(leadId: string, summary: string, outcome?: string): Promise<Activity> {
    return this.createActivity({
      lead_id: leadId,
      activity_type: 'email',
      activity_date: new Date().toISOString(),
      summary,
      outcome: outcome || null,
    });
  }

  async logMeeting(leadId: string, summary: string, outcome?: string): Promise<Activity> {
    return this.createActivity({
      lead_id: leadId,
      activity_type: 'meeting',
      activity_date: new Date().toISOString(),
      summary,
      outcome: outcome || null,
    });
  }

  async logNote(leadId: string, summary: string): Promise<Activity> {
    return this.createActivity({
      lead_id: leadId,
      activity_type: 'note',
      activity_date: new Date().toISOString(),
      summary,
      outcome: null,
    });
  }

  async logStatusChange(leadId: string, fromStatus: string, toStatus: string, note?: string): Promise<Activity> {
    return this.createActivity({
      lead_id: leadId,
      activity_type: 'status_change',
      activity_date: new Date().toISOString(),
      summary: `Status changed from "${fromStatus}" to "${toStatus}"`,
      outcome: note || null,
    });
  }

  async logAssignment(leadId: string, assignedTo: string, assignedBy: string): Promise<Activity> {
    return this.createActivity({
      lead_id: leadId,
      activity_type: 'assignment',
      activity_date: new Date().toISOString(),
      summary: `Lead assigned to ${assignedTo} by ${assignedBy}`,
      outcome: null,
    });
  }

  async getRecentActivities(days = 7): Promise<ActivityWithProfile[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        user_profile:profiles!activity_logs_user_id_fkey(
          id,
          full_name,
          email
        )
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