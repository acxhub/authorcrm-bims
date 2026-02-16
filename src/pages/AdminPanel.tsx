import React, { useEffect } from 'react';
import { Settings, Hash, Users, BarChart3, Database, GitBranch, Shield, Activity, TrendingUp, DollarSign, UserCog } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { TagManagement } from '@/components/admin/TagManagement';
import { UserManagement } from '@/components/admin/UserManagement';
import { StatusManagement } from '@/components/admin/StatusManagement';
import { useAuth, useProfile } from '@/hooks/useAuth';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useTagsRealtime } from '@/hooks/useTagsRealtime';
import { useStatusesRealtime } from '@/hooks/useStatusesRealtime';
import { CommissionTemplateManager } from '@/components/commissions/CommissionTemplateManager';
import { AgentCommissionSettings } from '@/components/commissions/AgentCommissionSettings';

const TABS = ['overview', 'users', 'pipeline', 'tags', 'commissions', 'agent-settings', 'analytics', 'system'];

export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const { profile, loading } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();

  // Enable realtime updates
  useTagsRealtime();
  useStatusesRealtime();

  // Get tab from URL, default to 'overview' if missing/invalid
  const urlTab = searchParams.get('tab');
  const activeTab = TABS.includes(urlTab || '') ? urlTab! : 'overview';

  // Keep tab in sync with URL
  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  // If no tab param or invalid, set to default
  useEffect(() => {
    if (!urlTab || !TABS.includes(urlTab)) {
      setSearchParams({ tab: 'overview' }, { replace: true });
    }
  }, [urlTab, setSearchParams]);

  // Only redirect if loading is done and user/profile/role is not correct
  if (!loading && (!user || !profile || profile.role !== 'leads_manager')) {
    return <Navigate to="/" replace />;
  }

  // Show loading while profile is being fetched
  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 to-blue-50">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                <p className="text-gray-600">Loading admin panel...</p>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

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
                    <Settings className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
                    <p className="text-sm text-gray-600">System management and configuration</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <NotificationBell />
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                  <Shield className="h-3 w-3 mr-1" />
                  Leads Manager Access
                </Badge>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
              <TabsList className="grid w-full grid-cols-8 bg-white/60 backdrop-blur-sm border border-gray-200/60">
                <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Users</span>
                </TabsTrigger>
                <TabsTrigger value="pipeline" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <GitBranch className="h-4 w-4" />
                  <span className="hidden sm:inline">Pipeline</span>
                </TabsTrigger>
                <TabsTrigger value="tags" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <Hash className="h-4 w-4" />
                  <span className="hidden sm:inline">Tags</span>
                </TabsTrigger>
                <TabsTrigger value="commissions" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <DollarSign className="h-4 w-4" />
                  <span className="hidden sm:inline">Commissions</span>
                </TabsTrigger>
                <TabsTrigger value="agent-settings" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <UserCog className="h-4 w-4" />
                  <span className="hidden sm:inline">Agent Settings</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="system" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <Database className="h-4 w-4" />
                  <span className="hidden sm:inline">System</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60 hover:shadow-lg transition-all duration-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        User Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        Manage system users, roles, and permissions across the platform.
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Quick Access</span>
                        <button 
                          onClick={() => handleTabChange('users')}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Manage →
                        </button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60 hover:shadow-lg transition-all duration-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <GitBranch className="h-5 w-5 text-green-600" />
                        </div>
                        Pipeline Stages
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        Configure sales pipeline stages, statuses, and workflow automation.
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Quick Access</span>
                        <button 
                          onClick={() => handleTabChange('pipeline')}
                          className="text-green-600 hover:text-green-700 text-sm font-medium"
                        >
                          Configure →
                        </button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60 hover:shadow-lg transition-all duration-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Hash className="h-5 w-5 text-purple-600" />
                        </div>
                        Tag System
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        Create and manage tags for organizing leads and tracking categories.
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Quick Access</span>
                        <button 
                          onClick={() => handleTabChange('tags')}
                          className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                        >
                          Manage →
                        </button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60 hover:shadow-lg transition-all duration-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <DollarSign className="h-5 w-5 text-orange-600" />
                        </div>
                        Commissions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        Manage commission templates, tiers, and agent settings.
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Quick Access</span>
                        <button
                          onClick={() => handleTabChange('commissions')}
                          className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                        >
                          Configure →
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      System Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-600">Online</div>
                        <div className="text-sm text-green-700">System Status</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">Active</div>
                        <div className="text-sm text-blue-700">Database</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="text-2xl font-bold text-purple-600">Stable</div>
                        <div className="text-sm text-purple-700">Performance</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* User Management Tab */}
              <TabsContent value="users" className="space-y-6">
                <UserManagement />
              </TabsContent>

              {/* Pipeline Stage Management Tab */}
              <TabsContent value="pipeline" className="space-y-6">
                <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GitBranch className="h-5 w-5 text-green-600" />
                      Pipeline Stage Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StatusManagement onStatusesUpdated={() => {}} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tag Management Tab */}
              <TabsContent value="tags" className="space-y-6">
                <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Hash className="h-5 w-5 text-purple-600" />
                      Tag Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TagManagement onTagsUpdated={() => {}} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Commissions Tab */}
              <TabsContent value="commissions" className="space-y-6">
                <CommissionTemplateManager />
              </TabsContent>

              {/* Agent Settings Tab */}
              <TabsContent value="agent-settings" className="space-y-6">
                <AgentCommissionSettings />
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6">
                <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-orange-600" />
                      System Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-gray-500">
                      <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium mb-2">Analytics Dashboard</h3>
                      <p className="text-sm mb-4">Comprehensive analytics and reporting coming soon...</p>
                      <div className="text-xs text-gray-400">
                        Features will include: Lead conversion rates, User activity metrics, System performance, Revenue tracking
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* System Settings Tab */}
              <TabsContent value="system" className="space-y-6">
                <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-gray-600" />
                      System Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-gray-500">
                      <Database className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium mb-2">System Configuration</h3>
                      <p className="text-sm mb-4">Advanced system settings and configuration options coming soon...</p>
                      <div className="text-xs text-gray-400">
                        Features will include: Email templates, Notification settings, API configuration, Security settings
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}; 