import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, LogOut } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { HeroPerformanceCard } from "@/components/dashboard/HeroPerformanceCard";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { CompactLeaderboard } from "@/components/dashboard/CompactLeaderboard";
import { RecentlyAssignedLeads } from "@/components/dashboard/RecentlyAssignedLeads";
import { MyPipeline } from "@/components/dashboard/MyPipeline";
import { ActionCenter } from "@/components/dashboard/ActionCenter";
import { AttendanceWidget } from "@/components/dashboard/AttendanceWidget";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useAuth, useProfile } from "@/hooks/useAuth";

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || 'U';
  };

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
                
                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full p-1 hover:bg-gray-100 transition-colors">
                      <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                        <AvatarImage src={profile?.avatar_url || ""} />
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-medium">
                          {getInitials(profile?.full_name, user?.email)}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{profile?.full_name || "User"}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        <p className="text-xs text-blue-600 capitalize">{profile?.role?.replace('_', ' ') || "User"}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer" 
                      onClick={handleSignOut}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="p-6 space-y-6">
            {/* Row 1: Hero Performance Card */}
            <HeroPerformanceCard />

            {/* Row 2: Needs Attention (conditional) */}
            <NeedsAttention />

            {/* Row 3: Attendance + Action Center */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2">
                <AttendanceWidget />
              </div>
              <div className="lg:col-span-3">
                <ActionCenter />
              </div>
            </div>

            {/* Row 4: Pipeline */}
            <MyPipeline userId={user?.id} />

            {/* Row 5: Activity + Recently Assigned */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3">
                <RecentActivity />
              </div>
              <div className="lg:col-span-2">
                <RecentlyAssignedLeads />
              </div>
            </div>

            {/* Row 6: Top Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2 lg:col-start-4">
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
