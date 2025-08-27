import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, TrendingUp, Award, Star, Medal } from 'lucide-react';
import { useDeals } from '@/hooks/useDeals';
import { useLeads } from '@/hooks/useLeads';
import { useUsersContext } from '@/contexts/UsersContext';
import { formatDistanceToNow } from 'date-fns';

export const Gamification = () => {
  const { data: dealsResponse } = useDeals({}, 1, 1000); // Get more deals
  const { data: leadsData } = useLeads({}, 1, 1000); // Get all leads
  const { activeUsers } = useUsersContext();
  
  // Extract the deals array from the response
  const allDeals = dealsResponse?.data || [];

  // Calculate metrics for each user
  const userMetrics = React.useMemo(() => {
    const metrics = {};

    // Initialize metrics for all users
    activeUsers.forEach(user => {
      metrics[user.id] = {
        user,
        dealsWon: 0,
        totalValue: 0,
        leadsCreated: 0,
        activitiesLogged: 0,
        conversionRate: 0,
        averageDealSize: 0,
      };
    });

    // Count deals won
    allDeals.forEach(deal => {
      if (deal.created_by && metrics[deal.created_by]) {
        // Assuming deals with certain status are "won"
        if (deal.status?.name?.toLowerCase().includes('won') || 
            deal.status?.name?.toLowerCase().includes('closed') ||
            deal.status?.name?.toLowerCase().includes('sold')) {
          metrics[deal.created_by].dealsWon++;
          metrics[deal.created_by].totalValue += deal.deal_value || 0;
        }
      }
    });

    // Count leads created
    leadsData?.data?.forEach(lead => {
      if (lead.created_by && metrics[lead.created_by]) {
        metrics[lead.created_by].leadsCreated++;
      }
    });

    // Calculate derived metrics
    Object.values(metrics).forEach(metric => {
      if (metric.dealsWon > 0) {
        metric.averageDealSize = metric.totalValue / metric.dealsWon;
      }
      if (metric.leadsCreated > 0) {
        metric.conversionRate = (metric.dealsWon / metric.leadsCreated) * 100;
      }
    });

    return metrics;
  }, [allDeals, leadsData, activeUsers]);

  // Create leaderboard
  const leaderboard = Object.values(userMetrics)
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 10);

  // Achievement definitions
  const achievements = [
    {
      id: 'first-deal',
      name: 'First Deal',
      description: 'Close your first deal',
      icon: Star,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      check: (metric) => metric.dealsWon >= 1,
    },
    {
      id: 'deal-maker',
      name: 'Deal Maker',
      description: 'Close 10 deals',
      icon: Trophy,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      check: (metric) => metric.dealsWon >= 10,
    },
    {
      id: 'high-roller',
      name: 'High Roller',
      description: 'Close deals worth $100,000+',
      icon: Award,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      check: (metric) => metric.totalValue >= 100000,
    },
    {
      id: 'lead-generator',
      name: 'Lead Generator',
      description: 'Create 50+ leads',
      icon: Target,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      check: (metric) => metric.leadsCreated >= 50,
    },
  ];

  // Calculate team totals
  const teamTotals = React.useMemo(() => {
    const totals = Object.values(userMetrics).reduce((acc, metric) => {
      acc.totalDeals += metric.dealsWon;
      acc.totalValue += metric.totalValue;
      acc.totalLeads += metric.leadsCreated;
      return acc;
    }, { totalDeals: 0, totalValue: 0, totalLeads: 0 });
    
    return totals;
  }, [userMetrics]);

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  // Get current month progress
  const currentMonthProgress = React.useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthDeals = allDeals.filter(deal => {
      const dealDate = new Date(deal.created_at);
      return dealDate >= startOfMonth;
    });

    return {
      deals: monthDeals.length,
      value: monthDeals.reduce((sum, deal) => sum + (deal.deal_value || 0), 0),
      target: 50, // Example target
      valueTarget: 500000, // Example target
    };
  }, [allDeals]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Gamification</h1>
          <p className="text-gray-600">Track performance, compete, and achieve your goals</p>
        </div>

        {/* Team Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Team Total Deals</p>
                  <p className="text-3xl font-bold text-gray-900">{teamTotals.totalDeals}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Trophy className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Team Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ${teamTotals.totalValue.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Leads</p>
                  <p className="text-3xl font-bold text-gray-900">{teamTotals.totalLeads}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Deals Closed</span>
                <span className="text-sm text-gray-600">
                  {currentMonthProgress.deals} / {currentMonthProgress.target}
                </span>
              </div>
              <Progress 
                value={(currentMonthProgress.deals / currentMonthProgress.target) * 100} 
                className="h-2"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Revenue Target</span>
                <span className="text-sm text-gray-600">
                  ${currentMonthProgress.value.toLocaleString()} / ${currentMonthProgress.valueTarget.toLocaleString()}
                </span>
              </div>
              <Progress 
                value={(currentMonthProgress.value / currentMonthProgress.valueTarget) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leaderboard.map((metric, index) => (
                <div key={metric.user.id} className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {index === 0 && <Medal className="h-6 w-6 text-yellow-500" />}
                      {index === 1 && <Medal className="h-6 w-6 text-gray-400" />}
                      {index === 2 && <Medal className="h-6 w-6 text-orange-600" />}
                      {index > 2 && (
                        <span className="text-lg font-bold text-gray-500 w-6 text-center">
                          {index + 1}
                        </span>
                      )}
                    </div>
                    
                    <Avatar>
                      <AvatarImage src={metric.user.avatar_url} />
                      <AvatarFallback>{getInitials(metric.user.full_name)}</AvatarFallback>
                    </Avatar>

                    <div>
                      <p className="font-medium text-gray-900">{metric.user.full_name || metric.user.email}</p>
                      <p className="text-sm text-gray-600 capitalize">{metric.user.role?.replace('_', ' ')}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-900">${metric.totalValue.toLocaleString()}</p>
                    <div className="flex items-center gap-2 justify-end">
                      <Badge variant="outline">{metric.dealsWon} deals</Badge>
                      <Badge variant="outline" className="text-green-600">
                        {metric.conversionRate.toFixed(1)}% conv
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}

              {leaderboard.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No sales data available yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle>Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {achievements.map(achievement => {
                const Icon = achievement.icon;
                const earnedBy = Object.values(userMetrics).filter(achievement.check);
                
                return (
                  <div key={achievement.id} className="p-4 rounded-lg border">
                    <div className={`p-3 rounded-lg ${achievement.bgColor} inline-block mb-3`}>
                      <Icon className={`h-6 w-6 ${achievement.color}`} />
                    </div>
                    <h4 className="font-semibold text-gray-900">{achievement.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{achievement.description}</p>
                    <div className="mt-3">
                      {earnedBy.length > 0 ? (
                        <div className="flex -space-x-2">
                          {earnedBy.slice(0, 3).map(metric => (
                            <Avatar key={metric.user.id} className="h-6 w-6 border-2 border-white">
                              <AvatarImage src={metric.user.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {getInitials(metric.user.full_name)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {earnedBy.length > 3 && (
                            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                              +{earnedBy.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Not earned yet</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};