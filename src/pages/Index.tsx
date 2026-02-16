import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Bell, Download } from "lucide-react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { PipelineBreakdown } from "@/components/dashboard/PipelineBreakdown";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { SalesLeaderboard } from "@/components/dashboard/SalesLeaderboard";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

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
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
                  <p className="text-sm text-gray-600">Welcome back! Here's what's happening today.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="bg-white/60 backdrop-blur-sm" aria-label="Export dashboard data">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm" className="bg-white/60 backdrop-blur-sm" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  onClick={() => navigate('/leads')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lead
                </Button>
              </div>
            </div>
          </header>

          <main className="p-6 space-y-8">
            {/* Real-time Metrics */}
            <DashboardMetrics />

            <div className="grid grid-cols-5 gap-8">
              {/* Recent Activity - 60% */}
              <div className="col-span-3">
                <RecentActivity />
              </div>

              {/* Right Column - 40% */}
              <div className="col-span-2 space-y-8">
                {/* Sales Leaderboard */}
                <SalesLeaderboard />
                
                {/* Pipeline Breakdown */}
                <PipelineBreakdown />
              </div>
            </div>

            {/* Quick Actions */}
            <QuickActions />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Index;
