import React, { useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useProfile } from '@/hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { CommissionDashboard } from '@/components/commissions/CommissionDashboard';
import { CommissionApprovalQueue } from '@/components/commissions/CommissionApprovalQueue';
import { CommissionAggregateReport } from '@/components/commissions/CommissionAggregateReport';

const TABS = ['my-commissions', 'approval-queue', 'reports'];

export const CommissionsPage: React.FC = () => {
  const { profile } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();

  const isManager = profile?.role === 'sales_manager' || profile?.role === 'leads_manager';

  const urlTab = searchParams.get('tab');
  const activeTab = TABS.includes(urlTab || '') ? urlTab! : 'my-commissions';

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (!urlTab || !TABS.includes(urlTab)) {
      setSearchParams({ tab: 'my-commissions' }, { replace: true });
    }
  }, [urlTab, setSearchParams]);

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
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Commissions</h1>
                    <p className="text-sm text-gray-600">Track and manage commission earnings</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <NotificationBell />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
              <TabsList className={`grid w-full max-w-md ${isManager ? 'grid-cols-3' : 'grid-cols-1'}`}>
                <TabsTrigger value="my-commissions">My Commissions</TabsTrigger>
                {isManager && (
                  <TabsTrigger value="approval-queue">Approval Queue</TabsTrigger>
                )}
                {isManager && (
                  <TabsTrigger value="reports">Reports</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="my-commissions">
                <CommissionDashboard />
              </TabsContent>

              {isManager && (
                <TabsContent value="approval-queue">
                  <CommissionApprovalQueue />
                </TabsContent>
              )}

              {isManager && (
                <TabsContent value="reports">
                  <CommissionAggregateReport />
                </TabsContent>
              )}
            </Tabs>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
