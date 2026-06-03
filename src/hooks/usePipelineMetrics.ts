import { useMemo } from 'react';
import { useLeadStats } from './useLeadStats';
import { useStatuses } from './useStatuses';

export interface PipelineMetrics {
  totalLeads: number;
  activeLeads: number;
  conversionRate: number;
  averageTimeToClose: number;
  statusBreakdown: Array<{
    statusId: string;
    statusName: string;
    statusColor: string;
    count: number;
    percentage: number;
  }>;
  recentActivity: {
    newLeadsThisWeek: number;
    closedWonThisMonth: number;
    closedLostThisMonth: number;
  };
}

const EMPTY_METRICS: PipelineMetrics = {
  totalLeads: 0,
  activeLeads: 0,
  conversionRate: 0,
  averageTimeToClose: 0,
  statusBreakdown: [],
  recentActivity: {
    newLeadsThisWeek: 0,
    closedWonThisMonth: 0,
    closedLostThisMonth: 0,
  },
};

export const usePipelineMetrics = () => {
  // Aggregated server-side over ALL leads (no client-side row cap / truncation).
  const { data: stats, isLoading: statsLoading } = useLeadStats();
  const { data: statuses, isLoading: statusesLoading } = useStatuses();

  const metrics = useMemo((): PipelineMetrics => {
    if (!stats || !statuses) return EMPTY_METRICS;

    const totalLeads = stats.total_leads;
    const conversionRate = totalLeads > 0 ? (stats.closed_won / totalLeads) * 100 : 0;

    // Build a status_id -> count lookup from the server aggregate, then map over all
    // statuses so zero-count stages still appear (matches previous behaviour).
    const countByStatus = new Map(
      (stats.status_counts || []).map((s) => [s.status_id, s.count])
    );
    const statusBreakdown = statuses
      .map((status) => {
        const count = countByStatus.get(status.id) || 0;
        const percentage = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
        return {
          statusId: status.id,
          statusName: status.name,
          statusColor: status.color,
          count,
          percentage: Math.round(percentage * 10) / 10,
        };
      })
      .sort((a, b) => b.count - a.count);

    return {
      totalLeads,
      activeLeads: stats.active_leads,
      conversionRate: Math.round(conversionRate * 10) / 10,
      averageTimeToClose: stats.avg_time_to_close,
      statusBreakdown,
      recentActivity: {
        newLeadsThisWeek: stats.new_leads_this_week,
        closedWonThisMonth: stats.closed_won_this_month,
        closedLostThisMonth: stats.closed_lost_this_month,
      },
    };
  }, [stats, statuses]);

  return {
    metrics,
    isLoading: statsLoading || statusesLoading,
  };
};
