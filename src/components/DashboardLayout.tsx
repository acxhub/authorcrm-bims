import React from 'react';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SidebarProvider>
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        {/* Add Topbar here if needed */}
        <main className="flex-1 bg-gray-50">{children}</main>
      </div>
    </div>
  </SidebarProvider>
); 