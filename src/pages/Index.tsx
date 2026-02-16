import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { HeroPerformanceCard } from "@/components/dashboard/HeroPerformanceCard";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { CompactLeaderboard } from "@/components/dashboard/CompactLeaderboard";
import { MyPipeline } from "@/components/dashboard/MyPipeline";
import { ActionCenter } from "@/components/dashboard/ActionCenter";
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
                <NotificationBell />
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

          <main className="p-6 space-y-6">
            {/* Row 1: Hero Performance Card */}
            <HeroPerformanceCard />

            {/* Row 2: Needs Attention (conditional) */}
            <NeedsAttention />

            {/* Row 3: Pipeline + Action Center */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3">
                <MyPipeline userId={user?.id} />
              </div>
              <div className="lg:col-span-2">
                <ActionCenter />
              </div>
            </div>

            {/* Row 4: Activity + Leaderboard */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3">
                <RecentActivity />
              </div>
              <div className="lg:col-span-2">
                <CompactLeaderboard />
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Index;
