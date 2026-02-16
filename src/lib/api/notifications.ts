import { supabase } from '@/integrations/supabase/client';

// Notification type constants
export const NOTIFICATION_TYPES = {
  // Lead notifications
  LEAD_ASSIGNED: 'lead_assigned',
  LEAD_CREATED: 'lead_created',
  LEAD_STATUS_CHANGED: 'lead_status_changed',
  LEAD_RECYCLED: 'lead_recycled',
  LEAD_DELETED: 'lead_deleted',

  // Deal notifications
  DEAL_CREATED: 'deal_created',
  DEAL_ASSIGNED: 'deal_assigned',
  DEAL_STATUS_CHANGED: 'deal_status_changed',
  DEAL_CLOSED_WON: 'deal_closed_won',
  DEAL_DELETED: 'deal_deleted',

  // Comment notifications
  COMMENT_ADDED: 'comment_added',
  COMMENT_REPLY: 'comment_reply',

  // Activity notifications
  ACTIVITY_LOGGED: 'activity_logged',

  // Commission notifications
  COMMISSION_CREATED: 'commission_created',

  // Admin notifications
  USER_ROLE_CHANGED: 'user_role_changed',
  USER_STATUS_CHANGED: 'user_status_changed',

  // Bulk notifications
  BULK_LEADS_ASSIGNED: 'bulk_leads_assigned',
  BULK_LEADS_IMPORTED: 'bulk_leads_imported',
  BULK_LEADS_RECYCLED: 'bulk_leads_recycled',
  BULK_LEADS_DELETED: 'bulk_leads_deleted',
  BULK_LEADS_STATUS_CHANGED: 'bulk_leads_status_changed',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

export interface CreateNotificationData {
  recipient_id: string;
  actor_id?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  entity_type?: 'lead' | 'deal' | 'user' | null;
  entity_id?: string | null;
  metadata?: Record<string, any>;
  group_key?: string | null;
}

export type Notification = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, any> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  group_key: string | null;
  actor_profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    role: string | null;
  } | null;
};

export class NotificationsAPI {
  async getNotifications(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{ data: Notification[]; count: number; unreadCount: number }> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('notifications')
      .select(`
        *,
        actor_profile:profiles!notifications_actor_id_fkey(
          id, full_name, email, avatar_url, role
        )
      `, { count: 'exact' })
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new Error(`Failed to fetch notifications: ${error.message}`);

    const { count: unreadCount, error: unreadError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (unreadError) throw new Error(`Failed to fetch unread count: ${unreadError.message}`);

    return {
      data: (data || []) as Notification[],
      count: count || 0,
      unreadCount: unreadCount || 0,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (error) throw new Error(`Failed to fetch unread count: ${error.message}`);
    return count || 0;
  }

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw new Error(`Failed to mark notification as read: ${error.message}`);
  }

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (error) throw new Error(`Failed to mark all as read: ${error.message}`);
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw new Error(`Failed to delete notification: ${error.message}`);
  }

  async createNotifications(notifications: CreateNotificationData[]): Promise<void> {
    // Filter out self-notifications (actor === recipient)
    const filtered = notifications.filter(n => n.recipient_id !== n.actor_id);
    if (filtered.length === 0) return;

    const { error } = await supabase
      .from('notifications')
      .insert(filtered);

    if (error) {
      console.error('Failed to create notifications:', error.message);
      // Don't throw - notification creation should never block the main action
    }
  }
}

export const notificationsApi = new NotificationsAPI();
