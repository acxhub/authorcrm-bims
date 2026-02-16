import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api/notifications';
import { useAuth } from '@/hooks/useAuth';

export type { Notification, NotificationType, CreateNotificationData } from '@/lib/api/notifications';
export { NOTIFICATION_TYPES } from '@/lib/api/notifications';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (userId: string, page: number) => [...notificationKeys.all, userId, page] as const,
  unreadCount: (userId: string) => [...notificationKeys.all, 'unread-count', userId] as const,
};

export function useNotifications(page = 1, limit = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: notificationKeys.list(user?.id || '', page),
    queryFn: () => notificationsApi.getNotifications(user!.id, page, limit),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUnreadNotificationCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: notificationKeys.unreadCount(user?.id || ''),
    queryFn: () => notificationsApi.getUnreadCount(user!.id),
    enabled: !!user?.id,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
