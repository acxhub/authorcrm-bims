import React, { useState } from 'react';
import { Bell, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { useNotifications, useMarkAllNotificationsRead } from '@/hooks/useNotifications';

const ITEMS_PER_PAGE = 20;

export const NotificationsPage: React.FC = () => {
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications(page, ITEMS_PER_PAGE);
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.data || [];
  const totalCount = data?.count || 0;
  const unreadCount = data?.unreadCount || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const displayedNotifications = tab === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const handleTabChange = (newTab: 'all' | 'unread') => {
    setTab(newTab);
    setPage(1);
  };

  // No-op for onNavigate since we're already on a full page (no popover to close)
  const handleNavigate = () => {};

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 to-blue-50">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="h-8 w-8" />
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Bell className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                    <p className="text-sm text-gray-600">
                      {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAllRead.mutate()}
                    disabled={markAllRead.isPending}
                  >
                    <CheckCheck className="h-4 w-4 mr-2" />
                    Mark all as read
                  </Button>
                )}
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-6">
            <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
              <CardContent className="p-0">
                {/* Tab filter */}
                <div className="px-6 pt-4 pb-3 border-b border-gray-200/60">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={tab === 'all' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleTabChange('all')}
                    >
                      All ({totalCount})
                    </Button>
                    <Button
                      variant={tab === 'unread' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleTabChange('unread')}
                    >
                      Unread ({unreadCount})
                    </Button>
                  </div>
                </div>

                {/* Notification list */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  </div>
                ) : displayedNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <Bell className="h-12 w-12 mb-3 text-gray-300" />
                    <p className="text-base font-medium">
                      {tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {tab === 'unread' ? 'You\'re all caught up!' : 'Notifications will appear here when there\'s activity.'}
                    </p>
                  </div>
                ) : (
                  <div>
                    {displayedNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && tab === 'all' && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200/60">
                    <p className="text-sm text-gray-500">
                      Page {page} of {totalPages} ({totalCount} total)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
