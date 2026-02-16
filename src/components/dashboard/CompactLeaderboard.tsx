import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Trophy, ArrowRight, Medal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUsersContext } from '@/contexts/UsersContext';
import { useDeals } from '@/hooks/useDeals';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface LeaderEntry {
  userId: string;
  name: string;
  avatar?: string;
  revenue: number;
  deals: number;
}

export const CompactLeaderboard: React.FC = () => {
  const navigate = useNavigate();
  const { users } = useUsersContext();
  const { data: dealsData } = useDeals({});

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Get sales users
  const salesUsers = users.filter(user => 
    user.role === 'sales' || 
    user.role === 'sales_agent' || 
    user.role === 'sales_manager'
  );

  // Calculate leaderboard
  const leaderboard: LeaderEntry[] = salesUsers.map(user => {
    const userDeals = dealsData?.data?.filter(deal => 
      deal.assigned_to === user.id &&
      new Date(deal.created_at!) >= monthStart &&
      new Date(deal.created_at!) <= monthEnd &&
      deal.status?.name?.toLowerCase().includes('closed won')
    ) || [];

    return {
      userId: user.id,
      name: user.full_name || user.email?.split('@')[0] || 'Unknown',
      avatar: user.avatar_url,
      revenue: userDeals.reduce((sum, d) => sum + (d.deal_value || 0), 0),
      deals: userDeals.length
    };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 3);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
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

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return 'from-yellow-50 to-amber-50 border-yellow-200';
      case 1: return 'from-gray-50 to-slate-100 border-gray-200';
      case 2: return 'from-orange-50 to-amber-50 border-orange-200';
      default: return 'bg-white border-gray-200';
    }
  };

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Trophy className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Top Performers</CardTitle>
              <p className="text-sm text-gray-500">{format(now, 'MMMM yyyy')}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/sales-board')}>
            View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {leaderboard.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Trophy className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No sales data this month</p>
          </div>
        ) : (
          leaderboard.map((entry, index) => (
            <div
              key={entry.userId}
              className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${getMedalColor(index)} border transition-all hover:shadow-md`}
            >
              <div className="relative">
                <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                  <AvatarImage src={entry.avatar} />
                  <AvatarFallback className="bg-gray-100 text-gray-600 font-medium">
                    {getInitials(entry.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -top-1 -right-1 text-sm">
                  {getMedalEmoji(index)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{entry.name}</p>
                <p className="text-xs text-gray-500">
                  {entry.deals} deal{entry.deals !== 1 ? 's' : ''} closed
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600">{formatCurrency(entry.revenue)}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
