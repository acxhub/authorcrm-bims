import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Users, DollarSign, Target, Activity } from 'lucide-react';
import { usePipelineMetrics } from '@/hooks/usePipelineMetrics';
import { useLeads } from '@/hooks/useLeads';
import { useDeals } from '@/hooks/useDeals';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  trend = 'neutral',
  icon: Icon,
  description,
  color = 'blue'
}) => {
  const colorClasses = {
    blue: 'from-blue-50 to-cyan-50 border-blue-200/60',
    green: 'from-green-50 to-emerald-50 border-green-200/60',
    purple: 'from-purple-50 to-violet-50 border-purple-200/60',
    orange: 'from-orange-50 to-amber-50 border-orange-200/60',
    red: 'from-red-50 to-rose-50 border-red-200/60'
  };

  const iconColorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600'
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3" />;
    if (trend === 'down') return <TrendingDown className="h-3 w-3" />;
    return null;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'bg-green-100 text-green-800 border-green-200';
    if (trend === 'down') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <Card className={`bg-gradient-to-br ${colorClasses[color]} hover:shadow-lg transition-all duration-300 hover:scale-[1.02]`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardDescription className="text-sm font-medium text-gray-600">
            {title}
          </CardDescription>
          <div className={`p-2 rounded-lg ${iconColorClasses[color]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          {change && (
            <Badge variant="secondary" className={`${getTrendColor()} font-medium`}>
              {getTrendIcon()}
              <span className="ml-1">{change}</span>
            </Badge>
          )}
          {description && (
            <p className="text-xs text-gray-500">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const DashboardMetrics: React.FC = () => {
  const { metrics, isLoading: metricsLoading } = usePipelineMetrics();
  const { data: leadsData, isLoading: leadsLoading } = useLeads({}, 1, 1000);
  const { data: dealsData, isLoading: dealsLoading } = useDeals({}, 1, 1000);

  if (metricsLoading || leadsLoading || dealsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const leads = leadsData?.data || [];
  const deals = dealsData?.data || [];

  // Calculate additional metrics
  const totalRevenue = deals.reduce((sum, deal) => sum + (deal.deal_value || 0), 0);
  const avgDealValue = deals.length > 0 ? totalRevenue / deals.length : 0;
  
  // Calculate this month's metrics
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  
  const leadsThisMonth = leads.filter(lead => new Date(lead.created_at!) >= thisMonth).length;
  const leadsLastMonth = leads.filter(lead => {
    const createdDate = new Date(lead.created_at!);
    return createdDate >= lastMonth && createdDate < thisMonth;
  }).length;
  
  const dealsThisMonth = deals.filter(deal => new Date(deal.created_at!) >= thisMonth).length;
  const dealsLastMonth = deals.filter(deal => {
    const createdDate = new Date(deal.created_at!);
    return createdDate >= lastMonth && createdDate < thisMonth;
  }).length;

  // Calculate percentage changes
  const leadsChange = leadsLastMonth > 0 ? ((leadsThisMonth - leadsLastMonth) / leadsLastMonth * 100) : 0;
  const dealsChange = dealsLastMonth > 0 ? ((dealsThisMonth - dealsLastMonth) / dealsLastMonth * 100) : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Total Leads"
        value={metrics.totalLeads.toLocaleString()}
        change={formatPercentage(leadsChange)}
        trend={leadsChange >= 0 ? 'up' : 'down'}
        icon={Users}
        description="All leads in system"
        color="blue"
      />
      
      <MetricCard
        title="Active Deals"
        value={metrics.activeLeads.toLocaleString()}
        change={formatPercentage(dealsChange)}
        trend={dealsChange >= 0 ? 'up' : 'down'}
        icon={Target}
        description="Excluding New Lead & Closed"
        color="green"
      />
      
      <MetricCard
        title="Conversion Rate"
        value={`${metrics.conversionRate}%`}
        change={metrics.conversionRate > 20 ? '+Good' : 'Needs work'}
        trend={metrics.conversionRate > 20 ? 'up' : 'down'}
        icon={TrendingUp}
        description="Lead to deal conversion"
        color="purple"
      />
      
      <MetricCard
        title="Total Revenue"
        value={formatCurrency(totalRevenue)}
        change={avgDealValue > 0 ? `Avg: ${formatCurrency(avgDealValue)}` : 'No deals'}
        trend={totalRevenue > 0 ? 'up' : 'neutral'}
        icon={DollarSign}
        description="All deal values"
        color="orange"
      />
    </div>
  );
}; 