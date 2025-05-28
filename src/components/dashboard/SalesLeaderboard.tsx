import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Calendar } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useDeals } from '@/hooks/useDeals';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatar?: string;
  pipelineCount: number;
  pipelineValue: number;
  convertedValue: number;
}

export const SalesLeaderboard: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { users = [] } = useUsers();
  const { data: dealsData } = useDeals({});

  // Get only sales users
  const salesUsers = users.filter(user => 
    user.role === 'sales' || 
    user.role === 'sales_agent' || 
    user.role === 'sales_manager'
  );

  // Calculate date range
  const [year, month] = selectedMonth.split('-').map(Number);
  const startDate = startOfMonth(new Date(year, month - 1));
  const endDate = endOfMonth(startDate);

  // Generate last 12 months for the dropdown
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: format(date, 'MMMM yyyy')
    };
  });

  // Calculate leaderboard data
  const leaderboardData: LeaderboardEntry[] = salesUsers.map(user => {
    const userDeals = dealsData?.data?.filter(deal => 
      deal.assigned_to === user.id &&
      new Date(deal.created_at!) >= startDate &&
      new Date(deal.created_at!) <= endDate
    ) || [];

    const pipelineDeals = userDeals.filter(deal => 
      !deal.status.name.toLowerCase().includes('closed')
    );

    const convertedDeals = userDeals.filter(deal => 
      deal.status.name.toLowerCase().includes('closed won')
    );

    return {
      userId: user.id,
      name: user.full_name || user.email || 'Unknown User',
      avatar: user.avatar_url,
      pipelineCount: pipelineDeals.length,
      pipelineValue: pipelineDeals.reduce((sum, deal) => sum + (deal.deal_value || 0), 0),
      convertedValue: convertedDeals.reduce((sum, deal) => sum + (deal.deal_value || 0), 0)
    };
  });

  // Sort by pipeline value
  leaderboardData.sort((a, b) => b.pipelineValue - a.pipelineValue);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <CardTitle className="text-lg font-semibold text-gray-900">
            Sales Leaderboard
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Table Header */}
          <div className="grid grid-cols-4 gap-4 py-2 text-sm font-medium text-gray-500 border-b">
            <div>Agent</div>
            <div className="text-right"># of Pipes</div>
            <div className="text-right">Pipeline Value</div>
            <div className="text-right">Converted Value</div>
          </div>

          {/* Table Body */}
          {leaderboardData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No sales data available for this period</p>
            </div>
          ) : (
            leaderboardData.map((entry, index) => (
              <div
                key={entry.userId}
                className="grid grid-cols-4 gap-4 py-3 items-center hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={entry.avatar} />
                      <AvatarFallback>{getInitials(entry.name)}</AvatarFallback>
                    </Avatar>
                    {index < 3 && (
                      <div className="absolute -top-1 -right-1">
                        {index === 0 && '🥇'}
                        {index === 1 && '🥈'}
                        {index === 2 && '🥉'}
                      </div>
                    )}
                  </div>
                  <span className="font-medium text-gray-900">{entry.name}</span>
                </div>
                <div className="text-right font-medium">{entry.pipelineCount}</div>
                <div className="text-right font-medium text-blue-600">
                  {formatCurrency(entry.pipelineValue)}
                </div>
                <div className="text-right font-medium text-green-600">
                  {formatCurrency(entry.convertedValue)}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 