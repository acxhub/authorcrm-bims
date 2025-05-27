import React, { useState } from 'react';
import { Settings, Hash, Users, BarChart3, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TagManagement } from '@/components/admin/TagManagement';
import { useAuth, useProfile } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const { profile, loading } = useProfile();
  const [activeTab, setActiveTab] = useState('tags');

  // Show loading while profile is being fetched
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Only allow leads_manager role to access admin panel
  if (!user || !profile || profile.role !== 'leads_manager') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            Leads Manager Only
          </Badge>
        </div>
        <p className="text-gray-600">
          Manage system settings, tags, users, and configurations
        </p>
      </div>

      {/* Admin Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tags" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Tag Management
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            System Settings
          </TabsTrigger>
        </TabsList>

        {/* Tag Management Tab */}
        <TabsContent value="tags" className="space-y-6">
          <TagManagement onTagsUpdated={() => {
            // Refresh any dependent data if needed
            console.log('Tags updated');
          }} />
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>User management functionality coming soon...</p>
                <p className="text-sm">This will include user creation, role assignment, and permissions.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                System Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Analytics dashboard coming soon...</p>
                <p className="text-sm">This will include lead conversion rates, user activity, and system metrics.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings Tab */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>System settings coming soon...</p>
                <p className="text-sm">This will include email templates, notification settings, and system configuration.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 