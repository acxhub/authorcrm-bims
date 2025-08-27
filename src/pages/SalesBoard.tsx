import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, TrendingUp, Award, Star, Medal, Crown, Zap, Calendar, Filter } from 'lucide-react';
import { useDeals } from '@/hooks/useDeals';
import { useLeads } from '@/hooks/useLeads';
import { useUsersContext } from '@/contexts/UsersContext';
import { useStatuses } from '@/hooks/useStatuses';
import { formatDistanceToNow, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { cn } from '@/lib/utils';

export const SalesBoard = () => {
  const { data: dealsResponse } = useDeals({}, 1, 1000);
  const { data: leadsData } = useLeads({}, 1, 1000);
  const { data: statuses } = useStatuses();
  const { activeUsers } = useUsersContext();
  
  // Filter state
  const [timeFilter, setTimeFilter] = useState('month'); // week, month, quarter, year, all, custom
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('leaderboard');
  
  // Sold deals analysis filters
  const [soldDealsFilters, setSoldDealsFilters] = useState({
    dateRange: { from: null, to: null },
    assignedTo: '',
    minValue: '',
    maxValue: '',
  });
  
  const allDeals = dealsResponse?.data || [];
  const allLeads = leadsData?.data || [];

  // Apply time filter to deals
  const filteredDeals = React.useMemo(() => {
    const now = new Date();
    let dateFrom = null;
    let dateTo = null;
    
    switch(timeFilter) {
      case 'week':
        dateFrom = startOfWeek(now);
        dateTo = endOfWeek(now);
        break;
      case 'month':
        dateFrom = startOfMonth(now);
        dateTo = endOfMonth(now);
        break;
      case 'quarter':
        dateFrom = subMonths(startOfMonth(now), 2);
        dateTo = endOfMonth(now);
        break;
      case 'year':
        dateFrom = new Date(now.getFullYear(), 0, 1);
        dateTo = new Date(now.getFullYear(), 11, 31);
        break;
      case 'custom':
        // Use selected month and year
        dateFrom = new Date(selectedYear, selectedMonth, 1);
        dateTo = new Date(selectedYear, selectedMonth + 1, 0); // Last day of month
        break;
      case 'all':
        return allDeals;
      default:
        return allDeals;
    }
    
    return allDeals.filter(deal => {
      const dealDate = new Date(deal.created_at);
      return dealDate >= dateFrom && (!dateTo || dealDate <= dateTo);
    });
  }, [allDeals, timeFilter, selectedMonth, selectedYear]);

  // Calculate metrics with filters
  const userMetrics = React.useMemo(() => {
    const metrics = {};

    // Filter users by role if needed
    const filteredUsers = roleFilter === 'all' 
      ? activeUsers 
      : activeUsers.filter(u => u.role === roleFilter);

    filteredUsers.forEach(user => {
      metrics[user.id] = {
        user,
        dealsWon: 0,
        totalValue: 0,
        leadsCreated: 0,
        conversionRate: 0,
        averageDealSize: 0,
        rank: 0,
        trend: 'up', // up, down, stable
      };
    });

    // Count deals and calculate values
    filteredDeals.forEach(deal => {
      if (deal.created_by && metrics[deal.created_by]) {
        if (deal.status?.name?.toLowerCase().includes('won') || 
            deal.status?.name?.toLowerCase().includes('closed') ||
            deal.status?.name?.toLowerCase().includes('sold')) {
          metrics[deal.created_by].dealsWon++;
          metrics[deal.created_by].totalValue += deal.deal_value || 0;
        }
      }
    });

    // Count leads in the time period
    const filteredLeads = timeFilter === 'all' ? allLeads : allLeads.filter(lead => {
      const now = new Date();
      let dateFrom = null;
      let dateTo = null;
      
      switch(timeFilter) {
        case 'week':
          dateFrom = startOfWeek(now);
          dateTo = endOfWeek(now);
          break;
        case 'month':
          dateFrom = startOfMonth(now);
          dateTo = endOfMonth(now);
          break;
        case 'quarter':
          dateFrom = subMonths(startOfMonth(now), 2);
          dateTo = endOfMonth(now);
          break;
        case 'year':
          dateFrom = new Date(now.getFullYear(), 0, 1);
          dateTo = new Date(now.getFullYear(), 11, 31);
          break;
        case 'custom':
          // Use selected month and year
          dateFrom = new Date(selectedYear, selectedMonth, 1);
          dateTo = new Date(selectedYear, selectedMonth + 1, 0);
          break;
        default:
          return true;
      }
      
      const leadDate = new Date(lead.created_at);
      return leadDate >= dateFrom && (!dateTo || leadDate <= dateTo);
    });

    filteredLeads.forEach(lead => {
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

    // Calculate ranks
    const sorted = Object.values(metrics).sort((a, b) => b.totalValue - a.totalValue);
    sorted.forEach((metric, index) => {
      metric.rank = index + 1;
    });

    return metrics;
  }, [filteredDeals, allLeads, activeUsers, roleFilter, timeFilter]);

  // Leaderboard
  const leaderboard = Object.values(userMetrics)
    .filter(m => m.totalValue > 0 || m.leadsCreated > 0)
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 10);

  // Achievements with progress
  const achievements = [
    {
      id: 'rookie',
      name: 'Rising Star',
      description: 'Close your first deal',
      icon: Star,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      requirement: 1,
      metric: 'dealsWon',
    },
    {
      id: 'closer',
      name: 'Deal Closer',
      description: 'Close 10 deals',
      icon: Zap,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      requirement: 10,
      metric: 'dealsWon',
    },
    {
      id: 'champion',
      name: 'Sales Champion',
      description: 'Close 25 deals',
      icon: Trophy,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      requirement: 25,
      metric: 'dealsWon',
    },
    {
      id: 'rainmaker',
      name: 'Rainmaker',
      description: 'Generate $100K+ in revenue',
      icon: Crown,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      requirement: 100000,
      metric: 'totalValue',
    },
  ];

  // Team totals
  const teamTotals = React.useMemo(() => {
    return Object.values(userMetrics).reduce((acc, metric) => {
      acc.totalDeals += metric.dealsWon;
      acc.totalValue += metric.totalValue;
      acc.totalLeads += metric.leadsCreated;
      acc.avgConversion = acc.totalLeads > 0 ? (acc.totalDeals / acc.totalLeads * 100) : 0;
      return acc;
    }, { totalDeals: 0, totalValue: 0, totalLeads: 0, avgConversion: 0 });
  }, [userMetrics]);

  // Monthly target progress
  const monthlyProgress = React.useMemo(() => {
    const currentMonthDeals = filteredDeals.filter(deal => {
      const dealDate = new Date(deal.created_at);
      const now = new Date();
      return dealDate.getMonth() === now.getMonth() && 
             dealDate.getFullYear() === now.getFullYear();
    });

    const value = currentMonthDeals.reduce((sum, deal) => sum + (deal.deal_value || 0), 0);
    const target = 500000; // Example monthly target
    const progress = Math.min((value / target) * 100, 100);

    return { value, target, progress, deals: currentMonthDeals.length };
  }, [filteredDeals]);

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  const getRankIcon = (rank) => {
    switch(rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-orange-600" />;
      default:
        return <span className="text-base font-bold text-gray-400 w-5 text-center">{rank}</span>;
    }
  };

  // Generate month options
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate year options (last 3 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  // Sold deals analysis (merged from SoldDashboard)
  const soldStatus = statuses?.find(s => 
    s.name.toLowerCase().includes('sold') || 
    s.name.toLowerCase().includes('closed') ||
    s.name.toLowerCase().includes('won')
  );

  const soldDeals = React.useMemo(() => {
    if (!soldStatus) return [];
    
    let filtered = allDeals.filter(deal => deal.status_id === soldStatus.id);

    // Apply sold deals specific filters
    if (soldDealsFilters.assignedTo) {
      filtered = filtered.filter(deal => deal.assigned_to === soldDealsFilters.assignedTo);
    }

    if (soldDealsFilters.minValue) {
      filtered = filtered.filter(deal => (deal.deal_value || 0) >= parseFloat(soldDealsFilters.minValue));
    }

    if (soldDealsFilters.maxValue) {
      filtered = filtered.filter(deal => (deal.deal_value || 0) <= parseFloat(soldDealsFilters.maxValue));
    }

    if (soldDealsFilters.dateRange.from) {
      filtered = filtered.filter(deal => {
        const dealDate = new Date(deal.created_at);
        return dealDate >= soldDealsFilters.dateRange.from;
      });
    }

    if (soldDealsFilters.dateRange.to) {
      filtered = filtered.filter(deal => {
        const dealDate = new Date(deal.created_at);
        return dealDate <= soldDealsFilters.dateRange.to;
      });
    }

    return filtered;
  }, [allDeals, soldStatus, soldDealsFilters]);

  // Sold deals metrics
  const soldMetrics = React.useMemo(() => {
    const totalSoldValue = soldDeals.reduce((sum, deal) => sum + (deal.deal_value || 0), 0);
    const averageDealSize = soldDeals.length > 0 ? totalSoldValue / soldDeals.length : 0;
    
    // Monthly sold deals for current month
    const currentMonthSold = soldDeals.filter(deal => {
      const dealDate = new Date(deal.created_at);
      const now = new Date();
      return dealDate.getMonth() === now.getMonth() && 
             dealDate.getFullYear() === now.getFullYear();
    });

    // Monthly sales trend
    const monthlySales = {};
    soldDeals.forEach(deal => {
      const month = new Date(deal.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!monthlySales[month]) {
        monthlySales[month] = { count: 0, value: 0 };
      }
      monthlySales[month].count++;
      monthlySales[month].value += deal.deal_value || 0;
    });

    return {
      totalSoldValue,
      averageDealSize,
      currentMonthCount: currentMonthSold.length,
      monthlySales
    };
  }, [soldDeals]);

  const clearSoldFilters = () => {
    setSoldDealsFilters({
      dateRange: { from: null, to: null },
      assignedTo: '',
      minValue: '',
      maxValue: '',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Trophy className="h-8 w-8 text-yellow-500" />
                Sales Board
              </h1>
              <p className="text-gray-600 mt-1">Track performance, compete, and celebrate success</p>
            </div>
            
            {/* Filters */}
            <div className="flex items-center gap-2">
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>

              {/* Show month/year selectors when custom is selected */}
              {timeFilter === 'custom' && (
                <>
                  <Select 
                    value={selectedMonth.toString()} 
                    onValueChange={(val) => setSelectedMonth(parseInt(val))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select 
                    value={selectedYear.toString()} 
                    onValueChange={(val) => setSelectedYear(parseInt(val))}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="sales_manager">Sales Manager</SelectItem>
                  <SelectItem value="leads_manager">Leads Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Team Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Team Deals</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{teamTotals.totalDeals}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {timeFilter === 'month' ? 'This month' : 
                     timeFilter === 'week' ? 'This week' : 
                     timeFilter === 'year' ? 'This year' :
                     timeFilter === 'quarter' ? 'This quarter' :
                     timeFilter === 'custom' ? `${months[selectedMonth]} ${selectedYear}` :
                     'All time'}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Trophy className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Revenue</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    ${(teamTotals.totalValue / 1000).toFixed(0)}K
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Avg: ${teamTotals.totalDeals > 0 ? (teamTotals.totalValue / teamTotals.totalDeals).toFixed(0) : 0}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Leads Generated</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{teamTotals.totalLeads}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Conv: {teamTotals.avgConversion.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Target</p>
                  <div className="mt-2">
                    <Progress value={monthlyProgress.progress} className="h-2" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    ${(monthlyProgress.value / 1000).toFixed(0)}K / ${(monthlyProgress.target / 1000).toFixed(0)}K
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="sold-analysis">Sold Analysis</TabsTrigger>
          </TabsList>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Sales Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {leaderboard.map((metric, index) => (
                    <div 
                      key={metric.user.id} 
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg transition-all hover:bg-gray-50",
                        index === 0 && "bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200",
                        index === 1 && "bg-gray-50 border border-gray-200",
                        index === 2 && "bg-orange-50 border border-orange-200"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-8">
                          {getRankIcon(index + 1)}
                        </div>
                        
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                          <AvatarImage src={metric.user.avatar_url} />
                          <AvatarFallback className="text-sm font-medium">
                            {getInitials(metric.user.full_name)}
                          </AvatarFallback>
                        </Avatar>

                        <div>
                          <p className="font-semibold text-gray-900">
                            {metric.user.full_name || metric.user.email}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {metric.user.role?.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {metric.dealsWon} deals · {metric.leadsCreated} leads
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          ${(metric.totalValue / 1000).toFixed(0)}K
                        </p>
                        <div className="flex items-center gap-2 justify-end mt-1">
                          {metric.conversionRate > 0 && (
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                metric.conversionRate > 20 ? "text-green-600 border-green-300" : 
                                metric.conversionRate > 10 ? "text-blue-600 border-blue-300" : 
                                "text-gray-600"
                              )}
                            >
                              {metric.conversionRate.toFixed(1)}% conv
                            </Badge>
                          )}
                          {metric.averageDealSize > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Avg ${(metric.averageDealSize / 1000).toFixed(0)}K
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {leaderboard.length === 0 && (
                    <div className="text-center py-12">
                      <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No sales data for the selected period</p>
                      <p className="text-sm text-gray-400 mt-1">Start closing deals to appear on the leaderboard!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales Achievements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map(achievement => {
                    const Icon = achievement.icon;
                    const earnedBy = Object.values(userMetrics).filter(m => 
                      m[achievement.metric] >= achievement.requirement
                    );
                    const topAchiever = earnedBy.sort((a, b) => 
                      b[achievement.metric] - a[achievement.metric]
                    )[0];
                    
                    return (
                      <div 
                        key={achievement.id} 
                        className={cn(
                          "p-6 rounded-lg border-2 transition-all",
                          earnedBy.length > 0 ? achievement.borderColor : "border-gray-200"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className={cn(
                            "p-3 rounded-lg inline-block",
                            earnedBy.length > 0 ? achievement.bgColor : "bg-gray-100"
                          )}>
                            <Icon className={cn(
                              "h-6 w-6",
                              earnedBy.length > 0 ? achievement.color : "text-gray-400"
                            )} />
                          </div>
                          {earnedBy.length > 0 && (
                            <Badge className="text-xs">
                              {earnedBy.length} {earnedBy.length === 1 ? 'person' : 'people'}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="mt-4">
                          <h4 className="font-semibold text-gray-900">{achievement.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{achievement.description}</p>
                        </div>

                        <div className="mt-4">
                          {topAchiever ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={topAchiever.user.avatar_url} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(topAchiever.user.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-gray-600">
                                Leader: {topAchiever.user.full_name?.split(' ')[0] || 'Unknown'}
                                {achievement.metric === 'totalValue' && 
                                  ` ($${(topAchiever.totalValue / 1000).toFixed(0)}K)`
                                }
                                {achievement.metric === 'dealsWon' && 
                                  ` (${topAchiever.dealsWon} deals)`
                                }
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Not earned yet</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performers by Metric */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Performers by Conversion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.values(userMetrics)
                      .filter(m => m.conversionRate > 0)
                      .sort((a, b) => b.conversionRate - a.conversionRate)
                      .slice(0, 5)
                      .map((metric, index) => (
                        <div key={metric.user.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-500 w-4">
                              {index + 1}.
                            </span>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={metric.user.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {getInitials(metric.user.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {metric.user.full_name?.split(' ')[0] || metric.user.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-24">
                              <Progress value={metric.conversionRate} className="h-2" />
                            </div>
                            <span className="text-sm font-semibold text-green-600 w-12 text-right">
                              {metric.conversionRate.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Performers by Average Deal Size */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Average Deal Size</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.values(userMetrics)
                      .filter(m => m.averageDealSize > 0)
                      .sort((a, b) => b.averageDealSize - a.averageDealSize)
                      .slice(0, 5)
                      .map((metric, index) => (
                        <div key={metric.user.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-500 w-4">
                              {index + 1}.
                            </span>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={metric.user.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {getInitials(metric.user.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {metric.user.full_name?.split(' ')[0] || metric.user.email}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-blue-600">
                            ${(metric.averageDealSize / 1000).toFixed(1)}K
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Sold Analysis Tab */}
          <TabsContent value="sold-analysis" className="space-y-6">
            {/* Sold Deals Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Sold Deals Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Date Range</label>
                    <DatePickerWithRange
                      date={soldDealsFilters.dateRange}
                      onDateChange={(range) => setSoldDealsFilters({...soldDealsFilters, dateRange: range})}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Assigned To</label>
                    <Select 
                      value={soldDealsFilters.assignedTo} 
                      onValueChange={(value) => setSoldDealsFilters({...soldDealsFilters, assignedTo: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All users</SelectItem>
                        {activeUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Min Value</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={soldDealsFilters.minValue}
                      onChange={(e) => setSoldDealsFilters({...soldDealsFilters, minValue: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Max Value</label>
                    <Input
                      type="number"
                      placeholder="No limit"
                      value={soldDealsFilters.maxValue}
                      onChange={(e) => setSoldDealsFilters({...soldDealsFilters, maxValue: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <Button variant="outline" size="sm" onClick={clearSoldFilters}>
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sold Deals Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Sold</p>
                      <p className="text-3xl font-bold text-gray-900">{soldDeals.length}</p>
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
                      <p className="text-sm text-gray-600">Total Value</p>
                      <p className="text-3xl font-bold text-gray-900">
                        ${soldMetrics.totalSoldValue.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Average Deal Size</p>
                      <p className="text-3xl font-bold text-gray-900">
                        ${Math.round(soldMetrics.averageDealSize).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Target className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">This Month</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {soldMetrics.currentMonthCount}
                      </p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <Calendar className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Sold Deals */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Sold Deals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {soldDeals.slice(0, 10).map(deal => (
                    <div key={deal.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{deal.offer_title}</p>
                        <p className="text-sm text-gray-600">
                          {deal.lead?.author_name} - {deal.lead?.book_title}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          ${(deal.deal_value || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(deal.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {soldDeals.length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                      No sold deals found with current filters
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Monthly Sales Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Sales Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(soldMetrics.monthlySales).slice(-6).map(([month, data]) => (
                    <div key={month} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{month}</span>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">{data.count} deals</Badge>
                        <span className="font-semibold">${data.value.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};