import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, TrendingUp, Award, Star, Medal, Crown, Zap, Calendar, Filter } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
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
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

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
        dateFrom = new Date(selectedYear, selectedMonth, 1);
        dateTo = new Date(selectedYear, selectedMonth + 1, 0);
        break;
      case 'all':
      default:
        return allDeals;
    }
    
    return allDeals.filter(deal => {
      const dealDate = new Date(deal.created_at);
      return (!dateFrom || dealDate >= dateFrom) && (!dateTo || dealDate <= dateTo);
    });
  }, [allDeals, timeFilter, selectedMonth, selectedYear]);

  // Apply time filter to leads
  const filteredLeads = React.useMemo(() => {
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
        dateFrom = new Date(selectedYear, selectedMonth, 1);
        dateTo = new Date(selectedYear, selectedMonth + 1, 0);
        break;
      case 'all':
      default:
        return allLeads;
    }
    
    return allLeads.filter(lead => {
      const leadDate = new Date(lead.created_at);
      return (!dateFrom || leadDate >= dateFrom) && (!dateTo || leadDate <= dateTo);
    });
  }, [allLeads, timeFilter, selectedMonth, selectedYear]);

  // Calculate metrics for each user
  const userMetrics = React.useMemo(() => {
    const metrics = {};
    
    // Get users to track
    const usersToTrack = roleFilter === 'all' 
      ? activeUsers 
      : activeUsers.filter(u => u.role === roleFilter);
    
    // Initialize metrics for all users
    usersToTrack.forEach(user => {
      metrics[user.id] = {
        id: user.id,
        name: user.full_name || user.email,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
        dealsWon: 0,
        totalValue: 0,
        leadsCreated: 0,
        avgDealSize: 0,
        closedDeals: [],
        conversionRate: 0,
        lastActivity: null,
      };
    });
    
    // Process deals
    filteredDeals.forEach(deal => {
      // Track deals won (assuming status_id matches a "won" status)
      const dealStatus = statuses?.find(s => s.id === deal.status_id);
      const isWon = dealStatus?.name?.toLowerCase().includes('won') || 
                    dealStatus?.name?.toLowerCase().includes('closed');
      
      if (isWon && deal.assigned_to && metrics[deal.assigned_to]) {
        metrics[deal.assigned_to].dealsWon++;
        metrics[deal.assigned_to].totalValue += deal.deal_value || 0;
        metrics[deal.assigned_to].closedDeals.push(deal);
        
        // Update last activity
        if (!metrics[deal.assigned_to].lastActivity || 
            new Date(deal.updated_at) > new Date(metrics[deal.assigned_to].lastActivity)) {
          metrics[deal.assigned_to].lastActivity = deal.updated_at;
        }
      }
    });
    
    // Process leads
    filteredLeads.forEach(lead => {
      if (lead.created_by && metrics[lead.created_by]) {
        metrics[lead.created_by].leadsCreated++;
      }
    });
    
    // Calculate derived metrics
    Object.values(metrics).forEach(metric => {
      metric.avgDealSize = metric.dealsWon > 0 ? metric.totalValue / metric.dealsWon : 0;
      metric.conversionRate = metric.leadsCreated > 0 
        ? (metric.dealsWon / metric.leadsCreated * 100) 
        : 0;
    });
    
    return metrics;
  }, [filteredDeals, filteredLeads, activeUsers, statuses, roleFilter]);

  // Sort users by total value for leaderboard
  const leaderboard = React.useMemo(() => {
    return Object.values(userMetrics)
      .sort((a, b) => b.totalValue - a.totalValue)
      .map((user, index) => ({ ...user, rank: index + 1 }));
  }, [userMetrics]);

  // Define achievements/badges
  const achievements = [
    {
      id: 'first-deal',
      name: 'First Deal',
      description: 'Close your first deal',
      icon: Star,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      requirement: 1,
      metric: 'dealsWon',
    },
    {
      id: 'deal-closer',
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
    
    // Apply sold deals filters
    if (soldDealsFilters.dateRange?.from) {
      filtered = filtered.filter(deal => 
        new Date(deal.created_at) >= soldDealsFilters.dateRange.from
      );
    }
    if (soldDealsFilters.dateRange?.to) {
      filtered = filtered.filter(deal => 
        new Date(deal.created_at) <= soldDealsFilters.dateRange.to
      );
    }
    if (soldDealsFilters.assignedTo) {
      filtered = filtered.filter(deal => 
        deal.assigned_to === soldDealsFilters.assignedTo
      );
    }
    if (soldDealsFilters.minValue) {
      filtered = filtered.filter(deal => 
        (deal.deal_value || 0) >= parseFloat(soldDealsFilters.minValue)
      );
    }
    if (soldDealsFilters.maxValue) {
      filtered = filtered.filter(deal => 
        (deal.deal_value || 0) <= parseFloat(soldDealsFilters.maxValue)
      );
    }
    
    return filtered;
  }, [allDeals, soldStatus, soldDealsFilters]);

  const soldAnalysis = React.useMemo(() => {
    const totalSoldValue = soldDeals.reduce((sum, deal) => sum + (deal.deal_value || 0), 0);
    const averageDealSize = soldDeals.length > 0 ? totalSoldValue / soldDeals.length : 0;
    
    // Current month sold deals
    const now = new Date();
    const currentMonthSold = soldDeals.filter(deal => {
      const dealDate = new Date(deal.created_at);
      return dealDate.getMonth() === now.getMonth() && 
             dealDate.getFullYear() === now.getFullYear();
    });
    
    // Monthly breakdown
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
                  <Trophy className="h-8 w-8 text-yellow-500" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Sales Board</h1>
                    <p className="text-sm text-gray-600">Track performance, compete, and celebrate success</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <NotificationBell />
                {/* Filters */}
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-36 bg-white/60 backdrop-blur-sm">
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
                      <SelectTrigger className="w-32 bg-white/60 backdrop-blur-sm">
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
                      <SelectTrigger className="w-24 bg-white/60 backdrop-blur-sm">
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
                  <SelectTrigger className="w-36 bg-white/60 backdrop-blur-sm">
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
          </header>

          {/* Main Content */}
          <main className="p-6">
            <div className="space-y-6">
              {/* Team Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                      <div className="space-y-4">
                        {leaderboard.map(user => (
                          <div
                            key={user.id}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-lg border transition-all",
                              user.rank === 1 && "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300",
                              user.rank === 2 && "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300",
                              user.rank === 3 && "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300",
                              user.rank > 3 && "hover:bg-gray-50"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex items-center justify-center w-10">
                                {getRankIcon(user.rank)}
                              </div>
                              
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div>
                                <p className="font-semibold text-gray-900">{user.name}</p>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <span>{user.dealsWon} deals</span>
                                  <span>•</span>
                                  <span>${(user.totalValue / 1000).toFixed(0)}K revenue</span>
                                  {user.lastActivity && (
                                    <>
                                      <span>•</span>
                                      <span>Active {formatDistanceToNow(new Date(user.lastActivity), { addSuffix: true })}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {user.conversionRate > 0 && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                  {user.conversionRate.toFixed(0)}% conv
                                </Badge>
                              )}
                              <Badge 
                                variant={user.rank === 1 ? "default" : "outline"}
                                className={cn(
                                  user.rank === 1 && "bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0"
                                )}
                              >
                                ${user.avgDealSize.toFixed(0)} avg
                              </Badge>
                            </div>
                          </div>
                        ))}
                        
                        {leaderboard.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            No sales data available for the selected period
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Achievements Tab */}
                <TabsContent value="achievements" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {leaderboard.map(user => (
                      <Card key={user.id}>
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatar_url} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-lg">{user.name}</CardTitle>
                              <p className="text-sm text-gray-600">{user.role}</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-3">
                            {achievements.map(achievement => {
                              const hasAchieved = user[achievement.metric] >= achievement.requirement;
                              const progress = Math.min((user[achievement.metric] / achievement.requirement) * 100, 100);
                              
                              return (
                                <div
                                  key={achievement.id}
                                  className={cn(
                                    "p-3 rounded-lg border-2 transition-all",
                                    hasAchieved 
                                      ? `${achievement.bgColor} ${achievement.borderColor}` 
                                      : "bg-gray-50 border-gray-200 opacity-60"
                                  )}
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <achievement.icon 
                                      className={cn(
                                        "h-5 w-5",
                                        hasAchieved ? achievement.color : "text-gray-400"
                                      )} 
                                    />
                                    <span className={cn(
                                      "text-xs font-semibold",
                                      hasAchieved ? "text-gray-900" : "text-gray-500"
                                    )}>
                                      {achievement.name}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600 mb-2">{achievement.description}</p>
                                  <div className="relative">
                                    <Progress value={progress} className="h-1.5" />
                                    <p className="text-xs text-gray-500 mt-1">
                                      {user[achievement.metric]}/{achievement.requirement}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Performance Tab */}
                <TabsContent value="performance" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Team Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {leaderboard.map(user => (
                          <div key={user.id} className="space-y-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{user.name}</p>
                                <p className="text-xs text-gray-600">{user.role}</p>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Deals Won</span>
                                <span className="font-semibold">{user.dealsWon}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Revenue</span>
                                <span className="font-semibold">${(user.totalValue / 1000).toFixed(1)}K</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Leads Created</span>
                                <span className="font-semibold">{user.leadsCreated}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Conversion</span>
                                <span className="font-semibold">{user.conversionRate.toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Avg Deal</span>
                                <span className="font-semibold">${user.avgDealSize.toFixed(0)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Sold Analysis Tab */}
                <TabsContent value="sold-analysis" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Sold Deals Analysis</CardTitle>
                        <div className="flex gap-2">
                          <DatePickerWithRange
                            date={soldDealsFilters.dateRange}
                            onDateChange={(range) => setSoldDealsFilters(prev => ({ ...prev, dateRange: range }))}
                          />
                          <Select 
                            value={soldDealsFilters.assignedTo}
                            onValueChange={(val) => setSoldDealsFilters(prev => ({ ...prev, assignedTo: val }))}
                          >
                            <SelectTrigger className="w-40">
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
                          <Input
                            type="number"
                            placeholder="Min value"
                            value={soldDealsFilters.minValue}
                            onChange={(e) => setSoldDealsFilters(prev => ({ ...prev, minValue: e.target.value }))}
                            className="w-28"
                          />
                          <Input
                            type="number"
                            placeholder="Max value"
                            value={soldDealsFilters.maxValue}
                            onChange={(e) => setSoldDealsFilters(prev => ({ ...prev, maxValue: e.target.value }))}
                            className="w-28"
                          />
                          <Button variant="outline" size="sm" onClick={clearSoldFilters}>
                            Clear
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <Card>
                          <CardContent className="p-4">
                            <p className="text-sm text-gray-600">Total Sold Value</p>
                            <p className="text-2xl font-bold">${(soldAnalysis.totalSoldValue / 1000).toFixed(0)}K</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <p className="text-sm text-gray-600">Average Deal Size</p>
                            <p className="text-2xl font-bold">${soldAnalysis.averageDealSize.toFixed(0)}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <p className="text-sm text-gray-600">Deals This Month</p>
                            <p className="text-2xl font-bold">{soldAnalysis.currentMonthCount}</p>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-gray-700">Recent Sold Deals</h4>
                        {soldDeals.slice(0, 10).map(deal => (
                          <div key={deal.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium text-sm">{deal.offer_title}</p>
                              <p className="text-xs text-gray-600">
                                {new Date(deal.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-green-600">
                              ${deal.deal_value?.toLocaleString() || 0}
                            </Badge>
                          </div>
                        ))}
                        
                        {soldDeals.length === 0 && (
                          <p className="text-center text-gray-500 py-4">No sold deals found</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};