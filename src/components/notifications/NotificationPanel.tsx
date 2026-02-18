import React, { useState } from 'react';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotifications, useMarkAllNotificationsRead } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';

interface NotificationPanelProps {
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose }) => {
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const { data, isLoading } = useNotifications(1, 50);
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.data || [];
  const unreadCount = data?.unreadCount || 0;

  const displayedNotifications = tab === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  return (
    <div className="flex flex-col max-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-gray-600" />
          <h3 className="font-semibold text-sm text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-xs text-blue-600 font-medium">
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-blue-600 hover:text-blue-700 h-7"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Tab filter */}
      <div className="px-4 pt-2 pb-1">
        <div className="flex gap-1">
          <Button
            variant={tab === 'all' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setTab('all')}
          >
            All
          </Button>
          <Button
            variant={tab === 'unread' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setTab('unread')}
          >
            Unread ({unreadCount})
          </Button>
        </div>
      </div>

      <Separator />

      {/* Notification list */}
      <ScrollArea className="flex-1 max-h-[350px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : displayedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Bell className="h-8 w-8 mb-2 text-gray-300" />
            <p className="text-sm">
              {tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {displayedNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onNavigate={onClose}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* See All link */}
      <Separator />
      <div className="px-4 py-2">
        <Link
          to="/notifications"
          onClick={onClose}
          className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium py-1 transition-colors"
        >
          See all notifications
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
};
