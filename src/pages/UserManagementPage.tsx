import React from 'react';
import { UserManagement } from '@/components/admin/UserManagement';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

const UserManagementPage: React.FC = () => {
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
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
                </div>
                <p className="text-sm text-gray-600">Manage users, roles, and permissions</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Add any topbar actions here if needed */}
              </div>
            </div>
          </header>
          <main className="p-6 space-y-8">
            <UserManagement />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default UserManagementPage; 