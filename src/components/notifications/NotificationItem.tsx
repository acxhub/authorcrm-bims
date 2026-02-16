import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useMarkNotificationRead } from '@/hooks/useNotifications';
import type { Notification } from '@/lib/api/notifications';
import {
  UserPlus, ArrowRight, MessageSquare, DollarSign,
  RotateCcw, Shield, FileUp, Bell, Trash2, Users,
} from 'lucide-react';

function getNotificationIcon(type: string) {
  if (type.includes('assigned')) return UserPlus;
  if (type.includes('closed_won') || type.includes('commission')) return DollarSign;
  if (type.includes('comment') || type.includes('reply')) return MessageSquare;
  if (type.includes('recycled')) return RotateCcw;
  if (type.includes('deleted')) return Trash2;
  if (type.includes('status')) return ArrowRight;
  if (type.includes('user_')) return Shield;
  if (type.includes('imported')) return FileUp;
  if (type.includes('bulk')) return Users;
  return Bell;
}

function getNotificationColor(type: string): string {
  if (type.includes('closed_won') || type.includes('commission')) return 'text-green-600 bg-green-50';
  if (type.includes('assigned')) return 'text-blue-600 bg-blue-50';
  if (type.includes('comment') || type.includes('reply')) return 'text-purple-600 bg-purple-50';
  if (type.includes('recycled') || type.includes('deleted')) return 'text-orange-600 bg-orange-50';
  if (type.includes('status')) return 'text-yellow-600 bg-yellow-50';
  if (type.includes('user_')) return 'text-gray-600 bg-gray-100';
  if (type.includes('imported')) return 'text-teal-600 bg-teal-50';
  return 'text-gray-600 bg-gray-100';
}

function getNavigationPath(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case 'lead':
      return `/leads/${entityId}`;
    case 'deal':
      return `/deals/${entityId}`;
    case 'user':
      return '/admin/users';
    default:
      return null;
  }
}

interface NotificationItemProps {
  notification: Notification;
  onNavigate: () => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onNavigate }) => {
  const navigate = useNavigate();
  const markRead = useMarkNotificationRead();

  const Icon = getNotificationIcon(notification.type);
  const colorClass = getNotificationColor(notification.type);

  const handleClick = () => {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }

    const path = getNavigationPath(notification.entity_type, notification.entity_id);
    if (path) {
      navigate(path);
      onNavigate();
    }
  };

  const initials = notification.actor_profile?.full_name
    ? notification.actor_profile.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : null;

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 border-b border-gray-100 last:border-b-0',
        !notification.is_read && 'bg-blue-50/40'
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {notification.actor_profile && initials ? (
          <Avatar className="h-8 w-8">
            <AvatarImage src={notification.actor_profile.avatar_url || ''} />
            <AvatarFallback className={cn('text-xs font-medium', colorClass)}>
              {initials}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className={cn('h-8 w-8 rounded-full flex items-center justify-center', colorClass)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            'text-sm leading-tight',
            !notification.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
          )}>
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-[10px] text-gray-400 mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
    </button>
  );
};
