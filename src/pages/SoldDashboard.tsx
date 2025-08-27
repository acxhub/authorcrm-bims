import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics';
import { PipelineBreakdown } from '@/components/dashboard/PipelineBreakdown';
import { SalesLeaderboard } from '@/components/dashboard/SalesLeaderboard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { useDeals } from '@/hooks/useDeals';
import { useStatuses } from '@/hooks/useStatuses';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, TrendingUp, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUsersContext } from '@/contexts/UsersContext';

export const SoldDashboard = () => {
  // Filter state
  const [filters, setFilters] = useState({
    dateRange: { from: null, to: null },
    assignedTo: '',
    minValue: '',
    maxValue: '',
  });

  const { data: statuses } = useStatuses();
  const { activeUsers } = useUsersContext();

  // Find the "sold" or "closed-won" status
  const soldStatus = statuses?.find(s => 
    s.name.toLowerCase().includes('sold') || 
    s.name.toLowerCase().includes('closed') ||
    s.name.toLowerCase().includes('won')
  );

  // Fetch deals with sold status - get more deals
  const { data: dealsResponse } = useDeals({}, 1, 1000);
  
  // Extract deals array from response
  const allDeals = dealsResponse?.data || [];
  
  // Filter for sold deals
  const soldDeals = React.useMemo(() => {
    if (!soldStatus) return [];
    
    let filtered = allDeals.filter(deal => deal.status_id === soldStatus.id);

    // Apply additional filters
    if (filters.assignedTo) {
      filtered = filtered.filter(deal => deal.assigned_to === filters.assignedTo);
    }

    if (filters.minValue) {
      filtered = filtered.filter(deal => (deal.deal_value || 0) >= parseFloat(filters.minValue));
    }

    if (filters.maxValue) {
      filtered = filtered.filter(deal => (deal.deal_value || 0) <= parseFloat(filters.maxValue));
    }

    if (filters.dateRange.from) {
      filtered = filtered.filter(deal => {
        const dealDate = new Date(deal.created_at);
        return dealDate >= filters.dateRange.from;
      });
    }

    if (filters.dateRange.to) {
      filtered = filtered.filter(deal => {
        const dealDate = new Date(deal.created_at);
        return dealDate <= filters.dateRange.to;
      });
    }

    return filtered;
  }, [allDeals, soldStatus, filters]);

  // Calculate metrics
  const totalSoldValue = soldDeals.reduce((sum, deal) => sum + (deal.deal_value || 0), 0);
  const averageDealSize = soldDeals.length > 0 ? totalSoldValue / soldDeals.length : 0;
  
  // Group by month for trend analysis
  const monthlySales = React.useMemo(() => {
    const grouped = {};
    soldDeals.forEach(deal => {
      const month = new Date(deal.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!grouped[month]) {
        grouped[month] = { count: 0, value: 0 };
      }
      grouped[month].count++;
      grouped[month].value += deal.deal_value || 0;
    });
    return grouped;
  }, [soldDeals]);

  const clearFilters = () => {
    setFilters({
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
          <h1 className="text-3xl font-bold text-gray-900">Sold Deals Dashboard</h1>
          <p className="text-gray-600">Track and analyze closed deals</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Date Range</label>
                <DatePickerWithRange
                  date={filters.dateRange}
                  onDateChange={(range) => setFilters({...filters, dateRange: range})}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Assigned To</label>
                <Select 
                  value={filters.assignedTo} 
                  onValueChange={(value) => setFilters({...filters, assignedTo: value})}
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
                  value={filters.minValue}
                  onChange={(e) => setFilters({...filters, minValue: e.target.value})}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Max Value</label>
                <Input
                  type="number"
                  placeholder="No limit"
                  value={filters.maxValue}
                  onChange={(e) => setFilters({...filters, maxValue: e.target.value})}
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Metrics */}
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
                    ${totalSoldValue.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-blue-600" />
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
                    ${averageDealSize.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
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
                    {soldDeals.filter(d => {
                      const dealDate = new Date(d.created_at);
                      const now = new Date();
                      return dealDate.getMonth() === now.getMonth() && 
                             dealDate.getFullYear() === now.getFullYear();
                    }).length}
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

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(monthlySales).slice(-6).map(([month, data]) => (
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
      </div>
    </DashboardLayout>
  );
};