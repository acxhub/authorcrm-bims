import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getLeadDisplayName, getLeadBookTitleDisplay } from '@/lib/lead-display';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';
import { CalendarIcon, DollarSign, TrendingUp, Users, Package, Trophy, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useNavigate } from 'react-router-dom';

interface DateRange {
  from?: Date;
  to?: Date;
}

interface ClosedDeal {
  id: string;
  offer_title: string;
  deal_value: number | null;
  category: string | null;
  created_at: string;
  updated_at: string | null;
  lead_id: string;
  assigned_to: string | null;
  lead?: {
    id: string;
    author_name: string;
    pen_name: string | null;
    book_title: string;
    primary_email: string | null;
    first_name: string | null;
    last_name: string | null;
  };
  assigned_to_profile?: {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
  };
  status?: {
    name: string;
    color: string;
  };
}

interface AgentPerformance {
  userId: string;
  name: string;
  avatar?: string;
  dealsCount: number;
  totalRevenue: number;
  avgDealValue: number;
}

export const SoldDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Fetch "Closed Won" status ID
  const { data: closedWonStatus } = useQuery({
    queryKey: ['closed-won-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('statuses')
        .select('id, name, color')
        .ilike('name', '%closed won%')
        .single();

      if (error) {
        console.error('Error fetching Closed Won status:', error);
        return null;
      }
      return data;
    },
  });

  // Fetch closed deals with proper filtering
  const { data: closedDeals, isLoading: dealsLoading } = useQuery({
    queryKey: ['closed-deals', closedWonStatus?.id, dateRange, categoryFilter],
    queryFn: async () => {
      if (!closedWonStatus?.id) return [];

      let query = supabase
        .from('deals')
        .select(`
          id,
          offer_title,
          deal_value,
          category,
          created_at,
          updated_at,
          lead_id,
          assigned_to,
          lead:leads!deals_lead_id_fkey(id, author_name, pen_name, book_title, primary_email, first_name, last_name),
          assigned_to_profile:profiles!deals_assigned_to_fkey(id, email, full_name, avatar_url),
          status:statuses!deals_status_id_fkey(name, color)
        `)
        .eq('status_id', closedWonStatus.id)
        .is('deleted_at', null);

      // Filter by updated_at (when deal was closed)
      if (dateRange.from) {
        query = query.gte('updated_at', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        // Add 1 day to include the entire end date
        const endDate = new Date(dateRange.to);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('updated_at', endDate.toISOString());
      }

      // Category filter
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching closed deals:', error);
        return [];
      }
      return (data || []) as ClosedDeal[];
    },
    enabled: !!closedWonStatus?.id,
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const deals = closedDeals || [];
    const totalRevenue = deals.reduce((sum, deal) => sum + (deal.deal_value || 0), 0);
    const totalDeals = deals.length;
    const avgDealValue = totalDeals > 0 ? totalRevenue / totalDeals : 0;
    
    // Unique leads that have closed deals
    const uniqueLeadIds = new Set(deals.map(d => d.lead_id));
    const convertedLeadsCount = uniqueLeadIds.size;

    // Category breakdown
    const byCategory = deals.reduce((acc, deal) => {
      const cat = deal.category || 'Uncategorized';
      if (!acc[cat]) acc[cat] = { count: 0, value: 0 };
      acc[cat].count++;
      acc[cat].value += deal.deal_value || 0;
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    return {
      totalRevenue,
      totalDeals,
      avgDealValue,
      convertedLeadsCount,
      byCategory
    };
  }, [closedDeals]);

  // Agent performance
  const agentPerformance = useMemo(() => {
    const deals = closedDeals || [];
    const byAgent = new Map<string, AgentPerformance>();

    for (const deal of deals) {
      if (!deal.assigned_to || !deal.assigned_to_profile) continue;
      
      const existing = byAgent.get(deal.assigned_to);
      if (existing) {
        existing.dealsCount++;
        existing.totalRevenue += deal.deal_value || 0;
        existing.avgDealValue = existing.totalRevenue / existing.dealsCount;
      } else {
        byAgent.set(deal.assigned_to, {
          userId: deal.assigned_to,
          name: deal.assigned_to_profile.full_name || deal.assigned_to_profile.email,
          avatar: deal.assigned_to_profile.avatar_url,
          dealsCount: 1,
          totalRevenue: deal.deal_value || 0,
          avgDealValue: deal.deal_value || 0
        });
      }
    }

    return Array.from(byAgent.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [closedDeals]);

  // Quick date range presets
  const setQuickDateRange = (preset: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all') => {
    const today = new Date();
    let from: Date | undefined;
    let to: Date = today;

    switch (preset) {
      case 'today':
        from = today;
        break;
      case 'week': {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 7);
        from = weekStart;
        break;
      }
      case 'month':
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case 'quarter':
        from = subMonths(today, 3);
        break;
      case 'year':
        from = startOfYear(today);
        break;
      case 'all':
        from = undefined;
        to = undefined as any;
        break;
    }

    setDateRange({ from, to: preset === 'all' ? undefined : to });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getMedalEmoji = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 to-green-50">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="h-8 w-8" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Sold Dashboard</h1>
                  <p className="text-sm text-gray-600">
                    Closed Won deals
                    {dateRange.from && dateRange.to && (
                      <span className="ml-1">
                        • {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <NotificationBell />
                
                {/* Category Filter */}
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[140px] bg-white/60">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Publishing">Publishing</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Event">Event</SelectItem>
                  </SelectContent>
                </Select>

                {/* Date Range Presets */}
                <div className="flex gap-1">
                  {(['month', 'quarter', 'year', 'all'] as const).map((preset) => (
                    <Button
                      key={preset}
                      variant="outline"
                      size="sm"
                      className={cn(
                        'bg-white/60 backdrop-blur-sm capitalize',
                        // Highlight active preset
                        preset === 'month' && dateRange.from?.getTime() === startOfMonth(new Date()).getTime() && 'bg-green-100 border-green-300'
                      )}
                      onClick={() => setQuickDateRange(preset)}
                    >
                      {preset === 'all' ? 'All Time' : preset}
                    </Button>
                  ))}
                </div>

                {/* Custom Date Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/60 backdrop-blur-sm"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      Custom
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      initialFocus
                      mode="range"
                      selected={dateRange}
                      onSelect={(range) => setDateRange(range || {})}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-6">
            <div className="space-y-6">
              {/* Hero Metrics */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-green-100">Total Revenue</CardTitle>
                    <DollarSign className="h-5 w-5 text-green-200" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatCurrency(metrics.totalRevenue)}
                    </div>
                    <p className="text-xs text-green-100 mt-1">
                      From {metrics.totalDeals} closed deal{metrics.totalDeals !== 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/60 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Closed Deals</CardTitle>
                    <Package className="h-5 w-5 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900">{metrics.totalDeals}</div>
                    <p className="text-xs text-gray-500 mt-1">
                      Successfully closed
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/60 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Unique Authors</CardTitle>
                    <Users className="h-5 w-5 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900">{metrics.convertedLeadsCount}</div>
                    <p className="text-xs text-gray-500 mt-1">
                      Authors with closed deals
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/60 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Avg Deal Value</CardTitle>
                    <TrendingUp className="h-5 w-5 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900">
                      {formatCurrency(metrics.avgDealValue)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Per closed deal
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Category Breakdown + Agent Performance */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Category Breakdown */}
                <Card className="bg-white/60 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">By Category</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(metrics.byCategory).length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No data</p>
                    ) : (
                      Object.entries(metrics.byCategory).map(([category, data]) => (
                        <div key={category} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={cn(
                              category === 'Publishing' && 'bg-blue-50 text-blue-700 border-blue-200',
                              category === 'Marketing' && 'bg-green-50 text-green-700 border-green-200',
                              category === 'Event' && 'bg-purple-50 text-purple-700 border-purple-200',
                            )}>
                              {category}
                            </Badge>
                            <span className="text-sm text-gray-500">{data.count} deals</span>
                          </div>
                          <span className="font-semibold text-gray-900">{formatCurrency(data.value)}</span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Agent Performance */}
                <Card className="bg-white/60 backdrop-blur-sm lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        <CardTitle className="text-lg">Top Performers</CardTitle>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => navigate('/sales-board')}>
                        View All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {agentPerformance.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">No sales data for this period</p>
                    ) : (
                      <div className="space-y-3">
                        {agentPerformance.slice(0, 5).map((agent, index) => (
                          <div
                            key={agent.userId}
                            className={cn(
                              'flex items-center gap-4 p-3 rounded-xl transition-colors',
                              index === 0 && 'bg-yellow-50 border border-yellow-200',
                              index === 1 && 'bg-gray-50 border border-gray-200',
                              index === 2 && 'bg-orange-50 border border-orange-200',
                              index > 2 && 'bg-white/50 border border-gray-100'
                            )}
                          >
                            <div className="relative">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={agent.avatar} />
                                <AvatarFallback>{getInitials(agent.name)}</AvatarFallback>
                              </Avatar>
                              {getMedalEmoji(index) && (
                                <span className="absolute -top-1 -right-1 text-sm">{getMedalEmoji(index)}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{agent.name}</p>
                              <p className="text-xs text-gray-500">
                                {agent.dealsCount} deal{agent.dealsCount !== 1 ? 's' : ''} • Avg {formatCurrency(agent.avgDealValue)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">{formatCurrency(agent.totalRevenue)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Deals List */}
              <Card className="bg-white/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Closed Deals</CardTitle>
                  <CardDescription>
                    All deals marked as "Closed Won" in the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dealsLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : closedDeals && closedDeals.length > 0 ? (
                    <div className="space-y-3">
                      {closedDeals.map((deal) => (
                        <button
                          key={deal.id}
                          onClick={() => navigate(`/deals/${deal.id}`)}
                          className="flex items-center justify-between w-full p-4 border rounded-xl hover:bg-white/80 hover:shadow-md transition-all text-left group"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            {deal.assigned_to_profile && (
                              <Avatar className="h-10 w-10 flex-shrink-0">
                                <AvatarImage src={deal.assigned_to_profile.avatar_url} />
                                <AvatarFallback>
                                  {getInitials(deal.assigned_to_profile.full_name || deal.assigned_to_profile.email)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-900 truncate group-hover:text-green-700">
                                  {deal.offer_title}
                                </p>
                                {deal.category && (
                                  <Badge variant="outline" className="text-xs flex-shrink-0">
                                    {deal.category}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 truncate">
                                {deal.lead ? getLeadDisplayName(deal.lead) : 'Unknown'}
                                {deal.lead && (
                                  <span className="text-gray-400">
                                    {' '}
                                    • {getLeadBookTitleDisplay(deal.lead.book_title)}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-400">
                                Closed {deal.updated_at ? format(new Date(deal.updated_at), 'MMM d, yyyy') : 'N/A'}
                                {deal.assigned_to_profile && (
                                  <span> by {deal.assigned_to_profile.full_name || deal.assigned_to_profile.email}</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <Badge className="bg-green-100 text-green-700 border-green-200 font-bold text-base px-3 py-1">
                              {formatCurrency(deal.deal_value || 0)}
                            </Badge>
                            <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-green-600 transition-colors" />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2">No closed deals found</p>
                      <p className="text-sm text-gray-400">
                        {dateRange.from && dateRange.to 
                          ? `Try adjusting the date range or category filter`
                          : 'Select a date range to see closed deals'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
