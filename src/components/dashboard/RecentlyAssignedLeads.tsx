import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, ArrowRight, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLeads } from '@/hooks/useLeads';
import { useAuth, useProfile } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

export const RecentlyAssignedLeads: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const isAgent = profile?.role === 'sales';

  // Fetch leads - for agents, only their assigned leads; for managers, all leads
  const filters = isAgent && user?.id ? { assigned_to: user.id } : {};
  const { data: leadsData, isLoading } = useLeads(filters, 1, 10);

  // Sort by updated_at (most recently assigned) and take latest 10
  const recentLeads = React.useMemo(() => {
    if (!leadsData?.data) return [];
    return [...leadsData.data]
      .filter(lead => lead.assigned_to) // Only show assigned leads
      .sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at || 0);
        const dateB = new Date(b.updated_at || b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 10);
  }, [leadsData?.data]);

  const getAuthorName = (lead: any) => {
    if (lead.author_name) return lead.author_name;
    if (lead.first_name || lead.last_name) {
      return `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
    }
    return 'Unknown Author';
  };

  if (isLoading) {
    return (
      <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserPlus className="h-5 w-5 text-blue-600" />
            </div>
            <CardTitle className="text-lg">Recently Assigned</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 p-2">
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserPlus className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Recently Assigned</CardTitle>
              <p className="text-sm text-gray-500">Latest {recentLeads.length} leads</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/leads')}>
            View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {recentLeads.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <UserPlus className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No assigned leads yet</p>
          </div>
        ) : (
          recentLeads.map((lead) => (
            <div
              key={lead.id}
              onClick={() => navigate(`/leads/${lead.id}`)}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-200"
            >
              <div className="p-2 bg-gray-100 rounded-full">
                <User className="h-4 w-4 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate text-sm">
                  {getAuthorName(lead)}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {lead.publisher || 'No publisher'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(lead.updated_at || lead.created_at!), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
