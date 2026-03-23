import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Edit, User, DollarSign, Clock, ArrowRight } from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { useDeals } from '@/hooks/useDeals';
import { useAuth, useProfile } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { getLeadDisplayName } from '@/lib/lead-display';

interface ActivityItem {
  id: string;
  type: 'lead' | 'deal' | 'activity';
  title: string;
  description: string;
  timestamp: string;
  user?: {
    name: string;
    avatar?: string;
  };
  status?: {
    name: string;
    color: string;
  };
  value?: number;
  link?: string;
}

export const RecentActivity: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const isAgent = profile?.role === 'sales';
  const agentFilter = isAgent && user?.id ? { assigned_to: user.id } : {};

  const { data: leadsData, isLoading: leadsLoading } = useLeads(agentFilter, 1, 10);
  const { data: dealsData, isLoading: dealsLoading } = useDeals(agentFilter, 1, 10);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'lead':
        return <User className="h-4 w-4" />;
      case 'deal':
        return <DollarSign className="h-4 w-4" />;
      case 'activity':
        return <Edit className="h-4 w-4" />;
      default:
        return <Plus className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'lead':
        return 'bg-blue-100 text-blue-600';
      case 'deal':
        return 'bg-green-100 text-green-600';
      case 'activity':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (leadsLoading || dealsLoading) {
    return (
      <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 rounded-xl bg-white/40 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Combine and sort all activities
  const allActivities: ActivityItem[] = [];

  // Add recent leads
  if (leadsData?.data) {
    leadsData.data.slice(0, 5).forEach(lead => {
      allActivities.push({
        id: `lead-${lead.id}`,
        type: 'lead',
        title: `New lead: ${getLeadDisplayName(lead)}`,
        description: lead.book_title || 'No book title',
        timestamp: lead.created_at!,
        user: lead.assigned_to_profile ? {
          name: lead.assigned_to_profile.full_name || 'Unknown',
          avatar: lead.assigned_to_profile.avatar_url
        } : undefined,
        status: {
          name: lead.status.name,
          color: lead.status.color
        },
        link: `/leads/${lead.id}`
      });
    });
  }

  // Add recent deals
  if (dealsData?.data) {
    dealsData.data.slice(0, 5).forEach(deal => {
      allActivities.push({
        id: `deal-${deal.id}`,
        type: 'deal',
        title: `New deal: ${deal.offer_title}`,
        description: deal.lead ? getLeadDisplayName(deal.lead) : 'Unknown author',
        timestamp: deal.created_at!,
        user: deal.assigned_to_profile ? {
          name: deal.assigned_to_profile.full_name || 'Unknown',
          avatar: deal.assigned_to_profile.avatar_url
        } : undefined,
        status: {
          name: deal.status.name,
          color: deal.status.color
        },
        value: deal.deal_value,
        link: `/deals/${deal.id}`
      });
    });
  }

  // Note: Activities are currently only available per lead, not globally
  // This could be enhanced in the future with a global activities endpoint

  // Sort by timestamp (most recent first)
  allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Take only the most recent 8 items
  const recentActivities = allActivities.slice(0, 8);

  const handleActivityClick = (activity: ActivityItem) => {
    if (activity.link) {
      navigate(activity.link);
    }
  };

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Recent Activity</CardTitle>
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentActivities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          recentActivities.map((activity, index) => (
            <div
              key={activity.id}
              className={`flex items-center justify-between p-4 rounded-xl bg-white/40 backdrop-blur-sm border border-gray-200/40 hover:bg-white/60 transition-all duration-200 hover:shadow-md animate-fade-in ${
                activity.link ? 'cursor-pointer' : ''
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => handleActivityClick(activity)}
            >
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 text-sm">{activity.title}</div>
                  <div className="text-sm text-gray-600">{activity.description}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </div>
                    {activity.user && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <div className="flex items-center gap-1">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={activity.user.avatar || ''} />
                            <AvatarFallback className="text-xs bg-gray-100">
                              {getInitials(activity.user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-gray-500">{activity.user.name}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {activity.value && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {formatCurrency(activity.value)}
                  </Badge>
                )}
                {activity.status && (
                  <Badge 
                    variant="outline" 
                    className="font-medium"
                    style={{ 
                      backgroundColor: `${activity.status.color}20`,
                      color: activity.status.color,
                      borderColor: activity.status.color
                    }}
                  >
                    {activity.status.name}
                  </Badge>
                )}
                {activity.link && (
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}; 