import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp, Users, Target } from 'lucide-react';
import { usePipelineMetrics } from '@/hooks/usePipelineMetrics';

interface StatusBarProps {
  status: {
    statusId: string;
    statusName: string;
    statusColor: string;
    count: number;
    percentage: number;
  };
  totalCount: number;
}

const StatusBar: React.FC<StatusBarProps> = ({ status, totalCount }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: status.statusColor }}
          />
          <span className="text-sm font-medium text-gray-700">{status.statusName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{status.count}</span>
          <Badge variant="secondary" className="text-xs">
            {status.percentage}%
          </Badge>
        </div>
      </div>
      <Progress 
        value={status.percentage} 
        className="h-2"
        style={{
          '--progress-background': `${status.statusColor}20`,
          '--progress-foreground': status.statusColor,
        } as React.CSSProperties}
      />
    </div>
  );
};

export const PipelineBreakdown: React.FC = () => {
  const { metrics, isLoading } = usePipelineMetrics();

  if (isLoading) {
    return (
      <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Pipeline Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
              </div>
              <div className="h-2 bg-gray-200 rounded"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const { statusBreakdown, totalLeads, activeLeads, conversionRate } = metrics;

  // Get top 5 statuses by count
  const topStatuses = statusBreakdown.slice(0, 5);

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-gray-600" />
          <CardTitle className="text-lg font-semibold text-gray-900">
            Status Distribution
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {topStatuses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">No pipeline data available</p>
          </div>
        ) : (
          <>
            {topStatuses.map((status, index) => (
              <div
                key={status.statusId}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <StatusBar status={status} totalCount={totalLeads} />
              </div>
            ))}
            {statusBreakdown.length > 5 && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  Showing top 5 statuses • {statusBreakdown.length - 5} more available
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}; 