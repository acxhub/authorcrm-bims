import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { CalendarIcon, DollarSign, TrendingUp, Users, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

interface ConvertedLead {
  id: string;
  author_name: string;
  book_title: string;
  deal_value: number | null;
  created_at: string;
  converted_at?: string;
  assigned_to_profile?: {
    email: string;
    full_name: string;
    avatar_url?: string;
  };
  deals?: {
    id: string;
    offer_title: string;
    deal_value: number | null;
    created_at: string;
    updated_at: string | null;
  }[];
}

interface DateRange {
  from?: Date;
  to?: Date;
}

export const SoldDashboard: React.FC = () => {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  // Fetch "Closed Won" status ID
  const { data: closedWonStatus } = useQuery({
    queryKey: ['closed-won-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('statuses')
        .select('id')
        .eq('name', 'Closed Won')
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch converted leads with their deals
  const { data: convertedLeads, isLoading: leadsLoading } = useQuery({
    queryKey: ['converted-leads', closedWonStatus?.id, dateRange],
    queryFn: async () => {
      if (!closedWonStatus?.id) return [];

      let query = supabase
        .from('leads')
        .select(`
          *,
          assigned_to_profile:profiles!leads_assigned_to_fkey(email, full_name, avatar_url),
          deals(id, offer_title, deal_value, created_at, updated_at, status_id)
        `)
        .eq('status_id', closedWonStatus.id);

      // Apply date range filter if set
      if (dateRange.from) {
        query = query.gte('created_at', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange.to) {
        query = query.lte('created_at', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Filter deals to only include closed won deals
      return (data || []).map(lead => ({
        ...lead,
        deals: lead.deals?.filter(deal => deal.status_id === closedWonStatus.id) || []
      }));
    },
    enabled: !!closedWonStatus?.id,
  });

  // Fetch converted deals
  const { data: convertedDeals, isLoading: dealsLoading } = useQuery({
    queryKey: ['converted-deals', closedWonStatus?.id, dateRange],
    queryFn: async () => {
      if (!closedWonStatus?.id) return [];

      let query = supabase
        .from('deals')
        .select(`
          *,
          lead:leads(author_name, book_title, primary_email),
          assigned_to_profile:profiles!deals_assigned_to_fkey(email, full_name, avatar_url),
          status:statuses(name, color)
        `)
        .eq('status_id', closedWonStatus.id);

      // Apply date range filter if set
      if (dateRange.from) {
        query = query.gte('updated_at', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange.to) {
        query = query.lte('updated_at', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!closedWonStatus?.id,
  });

  // Calculate metrics
  const totalRevenue = convertedDeals?.reduce((sum, deal) => sum + (deal.deal_value || 0), 0) || 0;
  const totalDeals = convertedDeals?.length || 0;
  const totalLeads = convertedLeads?.length || 0;
  const averageDealValue = totalDeals > 0 ? totalRevenue / totalDeals : 0;

  // Quick date range presets
  const setQuickDateRange = (preset: 'today' | 'week' | 'month' | 'quarter' | 'year') => {
    const today = new Date();
    let from: Date;
    let to: Date = today;

    switch (preset) {
      case 'today':
        from = today;
        break;
      case 'week':
        from = new Date(today.setDate(today.getDate() - 7));
        break;
      case 'month':
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case 'quarter':
        from = subMonths(today, 3);
        break;
      case 'year':
        from = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        from = today;
    }

    setDateRange({ from, to });
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
                  <h1 className="text-2xl font-bold text-gray-900">Sold Dashboard</h1>
                  <p className="text-sm text-gray-600">Track all converted leads and closed deals</p>
                </div>
              </div>

              {/* Date Range Selector */}
              <div className="flex gap-2">
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/60 backdrop-blur-sm"
                    onClick={() => setQuickDateRange('today')}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/60 backdrop-blur-sm"
                    onClick={() => setQuickDateRange('week')}
                  >
                    Week
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/60 backdrop-blur-sm"
                    onClick={() => setQuickDateRange('month')}
                  >
                    Month
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/60 backdrop-blur-sm"
                    onClick={() => setQuickDateRange('quarter')}
                  >
                    Quarter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/60 backdrop-blur-sm"
                    onClick={() => setQuickDateRange('year')}
                  >
                    Year
                  </Button>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'justify-start text-left font-normal bg-white/60 backdrop-blur-sm',
                        !dateRange && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, 'LLL dd, y')} -{' '}
                            {format(dateRange.to, 'LLL dd, y')}
                          </>
                        ) : (
                          format(dateRange.from, 'LLL dd, y')
                        )
                      ) : (
                        'Pick a date range'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      initialFocus
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
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
              {/* Metrics Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${totalRevenue.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      From closed deals
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Closed Deals</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalDeals}</div>
                    <p className="text-xs text-muted-foreground">
                      Successfully closed
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Converted Leads</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalLeads}</div>
                    <p className="text-xs text-muted-foreground">
                      Leads converted to sales
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Deal Value</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${averageDealValue.toFixed(0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Per closed deal
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs for Leads and Deals */}
              <Tabs defaultValue="deals" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="deals">Closed Deals</TabsTrigger>
                  <TabsTrigger value="leads">Converted Leads</TabsTrigger>
                </TabsList>

                <TabsContent value="deals" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Closed Deals</CardTitle>
                      <CardDescription>
                        All deals that have been successfully closed
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {dealsLoading ? (
                        <div className="space-y-2">
                          {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                          ))}
                        </div>
                      ) : convertedDeals && convertedDeals.length > 0 ? (
                        <div className="space-y-4">
                          {convertedDeals.map((deal) => (
                            <div
                              key={deal.id}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div>
                                  <p className="font-semibold">{deal.offer_title}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {deal.lead?.author_name} - {deal.lead?.book_title}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Closed on {deal.updated_at ? format(new Date(deal.updated_at), 'PPP') : 'N/A'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                {deal.assigned_to_profile && (
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={deal.assigned_to_profile.avatar_url} />
                                      <AvatarFallback>
                                        {deal.assigned_to_profile.full_name?.charAt(0) || 
                                         deal.assigned_to_profile.email.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm text-muted-foreground">
                                      {deal.assigned_to_profile.full_name || deal.assigned_to_profile.email}
                                    </span>
                                  </div>
                                )}
                                <Badge variant="outline" className="text-green-600">
                                  ${deal.deal_value?.toLocaleString() || '0'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          No closed deals found for the selected period
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="leads" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Converted Leads</CardTitle>
                      <CardDescription>
                        All leads that have been converted to sales
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {leadsLoading ? (
                        <div className="space-y-2">
                          {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                          ))}
                        </div>
                      ) : convertedLeads && convertedLeads.length > 0 ? (
                        <div className="space-y-4">
                          {convertedLeads.map((lead) => (
                            <div
                              key={lead.id}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div>
                                  <p className="font-semibold">{lead.author_name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {lead.book_title}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Converted on {format(new Date(lead.created_at), 'PPP')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                {lead.assigned_to_profile && (
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={lead.assigned_to_profile.avatar_url} />
                                      <AvatarFallback>
                                        {lead.assigned_to_profile.full_name?.charAt(0) || 
                                         lead.assigned_to_profile.email.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm text-muted-foreground">
                                      {lead.assigned_to_profile.full_name || lead.assigned_to_profile.email}
                                    </span>
                                  </div>
                                )}
                                <div className="text-right">
                                  <Badge variant="outline" className="text-green-600">
                                    ${lead.deal_value?.toLocaleString() || '0'}
                                  </Badge>
                                  {lead.deals && lead.deals.length > 0 && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {lead.deals.length} deal{lead.deals.length > 1 ? 's' : ''}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          No converted leads found for the selected period
                        </p>
                      )}
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