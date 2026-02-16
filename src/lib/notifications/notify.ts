import { notificationsApi, NOTIFICATION_TYPES, type CreateNotificationData } from '@/lib/api/notifications';

interface UserRef {
  id: string;
  full_name?: string | null;
  role?: string | null;
  is_active?: boolean | null;
}

function displayName(user: UserRef | null | undefined): string {
  return user?.full_name || 'Someone';
}

export function getManagers(users: UserRef[]): UserRef[] {
  return users.filter(u =>
    u.is_active !== false &&
    (u.role === 'leads_manager' || u.role === 'sales_manager')
  );
}

/**
 * Central notification dispatcher.
 * All methods are fire-and-forget (async but errors are swallowed by notificationsApi).
 */
export const notify = {
  // ============================================================
  // LEAD NOTIFICATIONS
  // ============================================================

  async leadCreated(params: {
    actorId: string;
    lead: { id: string; book_title?: string; assigned_to?: string | null };
    managers: UserRef[];
  }) {
    const { actorId, lead, managers } = params;
    const title = lead.book_title || 'Untitled Lead';
    const notifications: CreateNotificationData[] = [];

    for (const mgr of managers) {
      notifications.push({
        recipient_id: mgr.id,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.LEAD_CREATED,
        title: 'New Lead Created',
        message: `New lead "${title}" was created.`,
        entity_type: 'lead',
        entity_id: lead.id,
      });
    }

    if (lead.assigned_to) {
      notifications.push({
        recipient_id: lead.assigned_to,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.LEAD_ASSIGNED,
        title: 'Lead Assigned to You',
        message: `You have been assigned the lead "${title}".`,
        entity_type: 'lead',
        entity_id: lead.id,
      });
    }

    await notificationsApi.createNotifications(notifications);
  },

  async leadAssigned(params: {
    actorId: string;
    actorName: string;
    lead: { id: string; book_title?: string };
    newAssigneeId: string;
    previousAssigneeId?: string | null;
  }) {
    const { actorId, actorName, lead, newAssigneeId, previousAssigneeId } = params;
    const title = lead.book_title || 'Untitled Lead';
    const notifications: CreateNotificationData[] = [];

    notifications.push({
      recipient_id: newAssigneeId,
      actor_id: actorId,
      type: NOTIFICATION_TYPES.LEAD_ASSIGNED,
      title: 'Lead Assigned to You',
      message: `${actorName} assigned "${title}" to you.`,
      entity_type: 'lead',
      entity_id: lead.id,
    });

    if (previousAssigneeId && previousAssigneeId !== newAssigneeId) {
      notifications.push({
        recipient_id: previousAssigneeId,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.LEAD_ASSIGNED,
        title: 'Lead Reassigned',
        message: `"${title}" was reassigned to another user by ${actorName}.`,
        entity_type: 'lead',
        entity_id: lead.id,
      });
    }

    await notificationsApi.createNotifications(notifications);
  },

  async leadStatusChanged(params: {
    actorId: string;
    actorName: string;
    lead: { id: string; book_title?: string; assigned_to?: string | null };
    newStatusName: string;
    isTerminal: boolean;
    managers: UserRef[];
  }) {
    const { actorId, actorName, lead, newStatusName, isTerminal, managers } = params;
    const title = lead.book_title || 'Untitled Lead';
    const notifications: CreateNotificationData[] = [];

    if (lead.assigned_to) {
      notifications.push({
        recipient_id: lead.assigned_to,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.LEAD_STATUS_CHANGED,
        title: 'Lead Status Changed',
        message: `"${title}" status changed to "${newStatusName}" by ${actorName}.`,
        entity_type: 'lead',
        entity_id: lead.id,
        metadata: { status_name: newStatusName },
      });
    }

    if (isTerminal) {
      for (const mgr of managers) {
        notifications.push({
          recipient_id: mgr.id,
          actor_id: actorId,
          type: NOTIFICATION_TYPES.LEAD_STATUS_CHANGED,
          title: 'Lead Reached Terminal Status',
          message: `"${title}" was marked as "${newStatusName}" by ${actorName}.`,
          entity_type: 'lead',
          entity_id: lead.id,
          metadata: { status_name: newStatusName },
        });
      }
    }

    await notificationsApi.createNotifications(notifications);
  },

  async leadRecycled(params: {
    actorId: string;
    actorName: string;
    lead: { id: string; book_title?: string };
    previousAssigneeId: string | null;
  }) {
    const { actorId, actorName, lead, previousAssigneeId } = params;
    if (!previousAssigneeId) return;
    const title = lead.book_title || 'Untitled Lead';

    await notificationsApi.createNotifications([{
      recipient_id: previousAssigneeId,
      actor_id: actorId,
      type: NOTIFICATION_TYPES.LEAD_RECYCLED,
      title: 'Lead Recycled',
      message: `"${title}" was recycled by ${actorName} and is now unassigned.`,
      entity_type: 'lead',
      entity_id: lead.id,
    }]);
  },

  async leadDeleted(params: {
    actorId: string;
    actorName: string;
    lead: { id: string; book_title?: string; assigned_to?: string | null };
    managers: UserRef[];
  }) {
    const { actorId, actorName, lead, managers } = params;
    const title = lead.book_title || 'Untitled Lead';
    const notifications: CreateNotificationData[] = [];

    if (lead.assigned_to) {
      notifications.push({
        recipient_id: lead.assigned_to,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.LEAD_DELETED,
        title: 'Lead Deleted',
        message: `"${title}" was deleted by ${actorName}.`,
        entity_type: null,
        entity_id: null,
      });
    }

    for (const mgr of managers) {
      notifications.push({
        recipient_id: mgr.id,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.LEAD_DELETED,
        title: 'Lead Deleted',
        message: `"${title}" was deleted by ${actorName}.`,
        entity_type: null,
        entity_id: null,
      });
    }

    await notificationsApi.createNotifications(notifications);
  },

  // ============================================================
  // DEAL NOTIFICATIONS
  // ============================================================

  async dealCreated(params: {
    actorId: string;
    actorName: string;
    deal: { id: string; offer_title?: string; assigned_to?: string | null; deal_value?: number | null };
    managers: UserRef[];
  }) {
    const { actorId, actorName, deal, managers } = params;
    const title = deal.offer_title || 'Untitled Deal';
    const notifications: CreateNotificationData[] = [];

    if (deal.assigned_to) {
      notifications.push({
        recipient_id: deal.assigned_to,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.DEAL_CREATED,
        title: 'New Deal Created',
        message: `${actorName} created deal "${title}" assigned to you.`,
        entity_type: 'deal',
        entity_id: deal.id,
        metadata: { deal_value: deal.deal_value },
      });
    }

    for (const mgr of managers) {
      notifications.push({
        recipient_id: mgr.id,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.DEAL_CREATED,
        title: 'New Deal Created',
        message: `${actorName} created deal "${title}".`,
        entity_type: 'deal',
        entity_id: deal.id,
        metadata: { deal_value: deal.deal_value },
      });
    }

    await notificationsApi.createNotifications(notifications);
  },

  async dealAssigned(params: {
    actorId: string;
    actorName: string;
    deal: { id: string; offer_title?: string };
    newAssigneeId: string;
    previousAssigneeId?: string | null;
    managers: UserRef[];
  }) {
    const { actorId, actorName, deal, newAssigneeId, previousAssigneeId, managers } = params;
    const title = deal.offer_title || 'Untitled Deal';
    const notifications: CreateNotificationData[] = [];

    notifications.push({
      recipient_id: newAssigneeId,
      actor_id: actorId,
      type: NOTIFICATION_TYPES.DEAL_ASSIGNED,
      title: 'Deal Assigned to You',
      message: `${actorName} assigned deal "${title}" to you.`,
      entity_type: 'deal',
      entity_id: deal.id,
    });

    if (previousAssigneeId && previousAssigneeId !== newAssigneeId) {
      notifications.push({
        recipient_id: previousAssigneeId,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.DEAL_ASSIGNED,
        title: 'Deal Reassigned',
        message: `Deal "${title}" was reassigned by ${actorName}.`,
        entity_type: 'deal',
        entity_id: deal.id,
      });
    }

    for (const mgr of managers) {
      notifications.push({
        recipient_id: mgr.id,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.DEAL_ASSIGNED,
        title: 'Deal Reassigned',
        message: `${actorName} reassigned deal "${title}".`,
        entity_type: 'deal',
        entity_id: deal.id,
      });
    }

    await notificationsApi.createNotifications(notifications);
  },

  async dealStatusChanged(params: {
    actorId: string;
    actorName: string;
    deal: { id: string; offer_title?: string; assigned_to?: string | null; deal_value?: number | null };
    newStatusName: string;
    isClosedWon: boolean;
    managers: UserRef[];
  }) {
    const { actorId, actorName, deal, newStatusName, isClosedWon, managers } = params;
    const title = deal.offer_title || 'Untitled Deal';
    const notifications: CreateNotificationData[] = [];

    if (deal.assigned_to) {
      notifications.push({
        recipient_id: deal.assigned_to,
        actor_id: actorId,
        type: isClosedWon ? NOTIFICATION_TYPES.DEAL_CLOSED_WON : NOTIFICATION_TYPES.DEAL_STATUS_CHANGED,
        title: isClosedWon ? 'Deal Closed Won!' : 'Deal Status Changed',
        message: isClosedWon
          ? `Congratulations! Deal "${title}" has been closed as won!`
          : `Deal "${title}" moved to "${newStatusName}" by ${actorName}.`,
        entity_type: 'deal',
        entity_id: deal.id,
        metadata: { status_name: newStatusName, deal_value: deal.deal_value },
      });
    }

    if (isClosedWon) {
      for (const mgr of managers) {
        notifications.push({
          recipient_id: mgr.id,
          actor_id: actorId,
          type: NOTIFICATION_TYPES.DEAL_CLOSED_WON,
          title: 'Deal Closed Won!',
          message: `"${title}" closed as won by ${actorName}.`,
          entity_type: 'deal',
          entity_id: deal.id,
          metadata: { status_name: newStatusName, deal_value: deal.deal_value },
        });
      }
    }

    await notificationsApi.createNotifications(notifications);
  },

  async dealDeleted(params: {
    actorId: string;
    actorName: string;
    deal: { id: string; offer_title?: string; assigned_to?: string | null };
    managers: UserRef[];
  }) {
    const { actorId, actorName, deal, managers } = params;
    const title = deal.offer_title || 'Untitled Deal';
    const notifications: CreateNotificationData[] = [];

    if (deal.assigned_to) {
      notifications.push({
        recipient_id: deal.assigned_to,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.DEAL_DELETED,
        title: 'Deal Deleted',
        message: `"${title}" was deleted by ${actorName}.`,
        entity_type: null,
        entity_id: null,
      });
    }

    for (const mgr of managers) {
      notifications.push({
        recipient_id: mgr.id,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.DEAL_DELETED,
        title: 'Deal Deleted',
        message: `"${title}" was deleted by ${actorName}.`,
        entity_type: null,
        entity_id: null,
      });
    }

    await notificationsApi.createNotifications(notifications);
  },

  async commissionCreated(params: {
    actorId: string;
    deal: { id: string; offer_title?: string; assigned_to: string };
    commissionAmount: number;
    managers: UserRef[];
  }) {
    const { actorId, deal, commissionAmount, managers } = params;
    const title = deal.offer_title || 'Untitled Deal';
    const notifications: CreateNotificationData[] = [];

    notifications.push({
      recipient_id: deal.assigned_to,
      actor_id: actorId,
      type: NOTIFICATION_TYPES.COMMISSION_CREATED,
      title: 'Commission Earned!',
      message: `A commission of $${commissionAmount.toLocaleString()} was created for deal "${title}".`,
      entity_type: 'deal',
      entity_id: deal.id,
      metadata: { commission_amount: commissionAmount },
    });

    for (const mgr of managers) {
      notifications.push({
        recipient_id: mgr.id,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.COMMISSION_CREATED,
        title: 'Commission Created',
        message: `Commission of $${commissionAmount.toLocaleString()} created for deal "${title}".`,
        entity_type: 'deal',
        entity_id: deal.id,
        metadata: { commission_amount: commissionAmount },
      });
    }

    await notificationsApi.createNotifications(notifications);
  },

  // ============================================================
  // COMMENT NOTIFICATIONS
  // ============================================================

  async commentAdded(params: {
    actorId: string;
    actorName: string;
    lead: { id: string; book_title?: string; assigned_to?: string | null };
    isReply: boolean;
    parentCommentUserId?: string | null;
  }) {
    const { actorId, actorName, lead, isReply, parentCommentUserId } = params;
    const title = lead.book_title || 'Untitled Lead';
    const notifications: CreateNotificationData[] = [];

    if (isReply && parentCommentUserId) {
      notifications.push({
        recipient_id: parentCommentUserId,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.COMMENT_REPLY,
        title: 'Reply to Your Comment',
        message: `${actorName} replied to your comment on "${title}".`,
        entity_type: 'lead',
        entity_id: lead.id,
      });
    }

    if (lead.assigned_to) {
      notifications.push({
        recipient_id: lead.assigned_to,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.COMMENT_ADDED,
        title: 'New Comment on Your Lead',
        message: `${actorName} commented on "${title}".`,
        entity_type: 'lead',
        entity_id: lead.id,
      });
    }

    await notificationsApi.createNotifications(notifications);
  },

  // ============================================================
  // ACTIVITY NOTIFICATIONS
  // ============================================================

  async activityLogged(params: {
    actorId: string;
    actorName: string;
    lead: { id: string; book_title?: string; assigned_to?: string | null };
    activityType: string;
    managers: UserRef[];
  }) {
    const { actorId, actorName, lead, activityType, managers } = params;
    const title = lead.book_title || 'Untitled Lead';
    const typeLabel = activityType.replace('_', ' ');

    const notifications: CreateNotificationData[] = [];

    if (lead.assigned_to) {
      notifications.push({
        recipient_id: lead.assigned_to,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.ACTIVITY_LOGGED,
        title: 'Activity Logged',
        message: `${actorName} logged a ${typeLabel} on "${title}".`,
        entity_type: 'lead',
        entity_id: lead.id,
        metadata: { activity_type: activityType },
      });
    }

    for (const mgr of managers) {
      notifications.push({
        recipient_id: mgr.id,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.ACTIVITY_LOGGED,
        title: 'Activity Logged',
        message: `${actorName} logged a ${typeLabel} on "${title}".`,
        entity_type: 'lead',
        entity_id: lead.id,
        metadata: { activity_type: activityType },
      });
    }

    await notificationsApi.createNotifications(notifications);
  },

  // ============================================================
  // BULK NOTIFICATIONS (single notification per recipient)
  // ============================================================

  async bulkLeadsAssigned(params: {
    actorId: string;
    actorName: string;
    assigneeId: string;
    count: number;
  }) {
    const { actorId, actorName, assigneeId, count } = params;
    const groupKey = `bulk_assign_${Date.now()}_${actorId}`;

    await notificationsApi.createNotifications([{
      recipient_id: assigneeId,
      actor_id: actorId,
      type: NOTIFICATION_TYPES.BULK_LEADS_ASSIGNED,
      title: `${count} Leads Assigned to You`,
      message: `${actorName} assigned ${count} leads to you.`,
      entity_type: null,
      entity_id: null,
      group_key: groupKey,
      metadata: { count },
    }]);
  },

  async bulkLeadsImported(params: {
    actorId: string;
    actorName: string;
    count: number;
    managers: UserRef[];
    assigneeId?: string | null;
  }) {
    const { actorId, actorName, count, managers, assigneeId } = params;
    const groupKey = `bulk_import_${Date.now()}_${actorId}`;
    const notifications: CreateNotificationData[] = [];

    for (const mgr of managers) {
      notifications.push({
        recipient_id: mgr.id,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.BULK_LEADS_IMPORTED,
        title: `${count} Leads Imported`,
        message: `${actorName} imported ${count} leads.`,
        entity_type: null,
        entity_id: null,
        group_key: groupKey,
        metadata: { count },
      });
    }

    if (assigneeId) {
      notifications.push({
        recipient_id: assigneeId,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.BULK_LEADS_ASSIGNED,
        title: `${count} Imported Leads Assigned to You`,
        message: `${actorName} imported and assigned ${count} leads to you.`,
        entity_type: null,
        entity_id: null,
        group_key: groupKey,
        metadata: { count },
      });
    }

    await notificationsApi.createNotifications(notifications);
  },

  async bulkLeadsRecycled(params: {
    actorId: string;
    actorName: string;
    count: number;
    previousAssigneeIds: string[];
    managers: UserRef[];
  }) {
    const { actorId, actorName, count, previousAssigneeIds, managers } = params;
    const groupKey = `bulk_recycle_${Date.now()}_${actorId}`;
    const notifications: CreateNotificationData[] = [];

    const uniqueAssignees = [...new Set(previousAssigneeIds)];
    for (const assigneeId of uniqueAssignees) {
      notifications.push({
        recipient_id: assigneeId,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.BULK_LEADS_RECYCLED,
        title: 'Leads Recycled',
        message: `${actorName} recycled ${count} leads, some were removed from your queue.`,
        entity_type: null,
        entity_id: null,
        group_key: groupKey,
        metadata: { count },
      });
    }

    for (const mgr of managers) {
      notifications.push({
        recipient_id: mgr.id,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.BULK_LEADS_RECYCLED,
        title: `${count} Leads Recycled`,
        message: `${actorName} recycled ${count} leads.`,
        entity_type: null,
        entity_id: null,
        group_key: groupKey,
        metadata: { count },
      });
    }

    await notificationsApi.createNotifications(notifications);
  },

  async bulkLeadsDeleted(params: {
    actorId: string;
    actorName: string;
    count: number;
    managers: UserRef[];
  }) {
    const { actorId, actorName, count, managers } = params;
    const groupKey = `bulk_delete_${Date.now()}_${actorId}`;
    const notifications: CreateNotificationData[] = [];

    for (const mgr of managers) {
      notifications.push({
        recipient_id: mgr.id,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.BULK_LEADS_DELETED,
        title: `${count} Leads Deleted`,
        message: `${actorName} deleted ${count} leads.`,
        entity_type: null,
        entity_id: null,
        group_key: groupKey,
        metadata: { count },
      });
    }

    await notificationsApi.createNotifications(notifications);
  },

  async bulkLeadsStatusChanged(params: {
    actorId: string;
    actorName: string;
    count: number;
    newStatusName: string;
    managers: UserRef[];
  }) {
    const { actorId, actorName, count, newStatusName, managers } = params;
    const groupKey = `bulk_status_${Date.now()}_${actorId}`;
    const notifications: CreateNotificationData[] = [];

    for (const mgr of managers) {
      notifications.push({
        recipient_id: mgr.id,
        actor_id: actorId,
        type: NOTIFICATION_TYPES.BULK_LEADS_STATUS_CHANGED,
        title: `${count} Leads Status Changed`,
        message: `${actorName} changed ${count} leads to "${newStatusName}".`,
        entity_type: null,
        entity_id: null,
        group_key: groupKey,
        metadata: { count, status_name: newStatusName },
      });
    }

    await notificationsApi.createNotifications(notifications);
  },

  // ============================================================
  // ADMIN NOTIFICATIONS
  // ============================================================

  async userRoleChanged(params: {
    actorId: string;
    actorName: string;
    targetUserId: string;
    newRole: string;
  }) {
    await notificationsApi.createNotifications([{
      recipient_id: params.targetUserId,
      actor_id: params.actorId,
      type: NOTIFICATION_TYPES.USER_ROLE_CHANGED,
      title: 'Your Role Has Changed',
      message: `${params.actorName} changed your role to ${params.newRole.replace(/_/g, ' ')}.`,
      entity_type: 'user',
      entity_id: params.targetUserId,
      metadata: { new_role: params.newRole },
    }]);
  },

  async userStatusChanged(params: {
    actorId: string;
    actorName: string;
    targetUserId: string;
    isActive: boolean;
  }) {
    await notificationsApi.createNotifications([{
      recipient_id: params.targetUserId,
      actor_id: params.actorId,
      type: NOTIFICATION_TYPES.USER_STATUS_CHANGED,
      title: params.isActive ? 'Account Activated' : 'Account Deactivated',
      message: `Your account was ${params.isActive ? 'activated' : 'deactivated'} by ${params.actorName}.`,
      entity_type: 'user',
      entity_id: params.targetUserId,
    }]);
  },
};
