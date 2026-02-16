import React, { useState } from 'react';
import { CheckSquare, Plus } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { RemindersList } from '@/components/reminders/RemindersList';
import { CreateReminderDialog } from '@/components/reminders/CreateReminderDialog';

export const RemindersPage: React.FC = () => {
  const { user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  const userId = user?.id || '';

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
                    <CheckSquare className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
                    <p className="text-sm text-gray-600">Manage your tasks and to-dos</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <NotificationBell />
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Reminder
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-6">
            <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
              <CardContent className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full max-w-xs grid-cols-2 mb-6">
                    <TabsTrigger value="active">Active</TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                  </TabsList>

                  <TabsContent value="active">
                    {userId && (
                      <RemindersList userId={userId} showCompleted={false} />
                    )}
                  </TabsContent>

                  <TabsContent value="all">
                    {userId && (
                      <RemindersList userId={userId} showCompleted />
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </main>
        </SidebarInset>
      </div>

      <CreateReminderDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </SidebarProvider>
  );
};
