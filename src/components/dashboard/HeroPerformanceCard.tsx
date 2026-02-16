import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Target, Trophy, Percent } from 'lucide-react';
import { useDeals } from '@/hooks/useDeals';
import { useLeads } from '@/hooks/useLeads';
import { useProfile, useAuth } from '@/hooks/useAuth';
import { startOfMonth, endOfMonth, subMonths, differenceInDays } from 'date-fns';

interface StatItemProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, subValue, trend, trendValue, icon: Icon, color }) => {
  return (
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">{value}</span>
          {trendValue && trend && (
            <Badge 
              variant="secondary" 
              className={`text-xs ${
                trend === 'up' ? 'bg-green-100 text-green-700' : 
                trend === 'down' ? 'bg-red-100 text-red-700' : 
                'bg-gray-100 text-gray-600'
              }`}
            >
              {trend === 'up' && <TrendingUp className="h-3 w-3 mr-1" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3 mr-1" />}
              {trendValue}
            </Badge>
          )}
        </div>
        {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
      </div>
    </div>
  );
};

export const HeroPerformanceCard: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const isAgent = profile?.role === 'sales';
  
  const filters = isAgent && user?.id ? { assigned_to: user.id } : {};
  const { data: dealsData, isLoading: dealsLoading } = useDeals(filters, 1, 500);
  const { data: leadsData, isLoading: leadsLoading } = useLeads(filters, 1, 500);

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const deals = dealsData?.data || [];
  const leads = leadsData?.data || [];

  // This month's metrics
  const dealsThisMonth = deals.filter(d => {
    const created = new Date(d.created_at!);
    return created >= thisMonthStart && created <= thisMonthEnd;
  });

  const dealsLastMonth = deals.filter(d => {
    const created = new Date(d.created_at!);
    return created >= lastMonthStart && created <= lastMonthEnd;
  });

  const wonDealsThisMonth = dealsThisMonth.filter(d => 
    d.status?.name?.toLowerCase().includes('closed won')
  );

  const wonDealsLastMonth = dealsLastMonth.filter(d => 
    d.status?.name?.toLowerCase().includes('closed won')
  );

  const revenueThisMonth = wonDealsThisMonth.reduce((sum, d) => sum + (d.deal_value || 0), 0);
  const revenueLastMonth = wonDealsLastMonth.reduce((sum, d) => sum + (d.deal_value || 0), 0);

  // Active pipeline (not closed)
  const activePipeline = deals.filter(d => {
    const status = d.status?.name?.toLowerCase() || '';
    return !status.includes('closed') && !status.includes('lost') && !status.includes('dead');
  });

  const pipelineValue = activePipeline.reduce((sum, d) => sum + (d.deal_value || 0), 0);

  // Conversion rate (won / total created this month)
  const conversionRate = dealsThisMonth.length > 0 
    ? (wonDealsThisMonth.length / dealsThisMonth.length * 100) 
    : 0;

  const lastMonthConversion = dealsLastMonth.length > 0
    ? (wonDealsLastMonth.length / dealsLastMonth.length * 100)
    : 0;

  // Calculate trends
  const revenueTrend = revenueLastMonth > 0 
    ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100)
    : revenueThisMonth > 0 ? 100 : 0;

  const dealsTrend = wonDealsLastMonth.length > 0
    ? ((wonDealsThisMonth.length - wonDealsLastMonth.length) / wonDealsLastMonth.length * 100)
    : wonDealsThisMonth.length > 0 ? 100 : 0;

  const conversionTrend = lastMonthConversion > 0
    ? conversionRate - lastMonthConversion
    : 0;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatTrend = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(0)}%`;
  };

  const isLoading = dealsLoading || leadsLoading;

  // Get greeting based on time
  const getGreeting = () => {
    const hour = now.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  // Days left in month
  const daysLeft = differenceInDays(thisMonthEnd, now);

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 shadow-xl">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-white/20 rounded w-1/3"></div>
            <div className="grid grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-white/10 rounded-xl"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white border-0 shadow-xl overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <CardContent className="p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">{getGreeting()}, {firstName}!</h2>
            <p className="text-blue-100 text-sm mt-1">
              Here's your performance this month • {daysLeft} days left
            </p>
          </div>
          <Badge className="bg-white/20 text-white border-0 hover:bg-white/30">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/15 transition-colors">
            <StatItem
              label="Revenue Won"
              value={formatCurrency(revenueThisMonth)}
              subValue={`${wonDealsThisMonth.length} deal${wonDealsThisMonth.length !== 1 ? 's' : ''} closed`}
              trend={revenueTrend >= 0 ? 'up' : 'down'}
              trendValue={formatTrend(revenueTrend)}
              icon={DollarSign}
              color="bg-green-500/20 text-green-300"
            />
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/15 transition-colors">
            <StatItem
              label="Deals Won"
              value={wonDealsThisMonth.length}
              subValue={`${dealsThisMonth.length} total created`}
              trend={dealsTrend >= 0 ? 'up' : 'down'}
              trendValue={formatTrend(dealsTrend)}
              icon={Trophy}
              color="bg-yellow-500/20 text-yellow-300"
            />
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/15 transition-colors">
            <StatItem
              label="Pipeline Value"
              value={formatCurrency(pipelineValue)}
              subValue={`${activePipeline.length} active deal${activePipeline.length !== 1 ? 's' : ''}`}
              icon={Target}
              color="bg-purple-500/20 text-purple-300"
            />
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/15 transition-colors">
            <StatItem
              label="Conversion Rate"
              value={`${conversionRate.toFixed(0)}%`}
              subValue="deals won / created"
              trend={conversionTrend >= 0 ? 'up' : conversionTrend < 0 ? 'down' : 'neutral'}
              trendValue={conversionTrend !== 0 ? `${conversionTrend >= 0 ? '+' : ''}${conversionTrend.toFixed(0)}pp` : undefined}
              icon={Percent}
              color="bg-cyan-500/20 text-cyan-300"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
