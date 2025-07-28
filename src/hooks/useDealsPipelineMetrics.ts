import { useMemo } from 'react';
import { useDeals } from './useDeals';
import { useStatuses } from './useStatuses';

export interface DealsPipelineMetrics {
  totalDeals: number;
  activeDeals: number;
  pipelineValue: number;
  averageDealValue: number;
  statusBreakdown: Array<{
    statusId: string;
    statusName: string;
    statusColor: string;
    count: number;
    percentage: number;
    value: number;
  }>;
  recentActivity: {
    newDealsThisWeek: number;
    closedWonThisMonth: number;
    closedLostThisMonth: number;
  };
}

export const useDealsPipelineMetrics = () => {
  const { data: dealsData, isLoading: dealsLoading } = useDeals({}, 1, 1000);
  const { data: statuses, isLoading: statusesLoading } = useStatuses();

  const metrics = useMemo((): DealsPipelineMetrics => {
    if (!dealsData?.data || !statuses) {
      return {
        totalDeals: 0,
        activeDeals: 0,
        pipelineValue: 0,
        averageDealValue: 0,
        statusBreakdown: [],
        recentActivity: {
          newDealsThisWeek: 0,
          closedWonThisMonth: 0,
          closedLostThisMonth: 0,
        },
      };
    }

    const deals = dealsData.data;
    const totalDeals = deals.length;

    // Find closed statuses (assuming "Closed Won" and "Closed Lost" contain these keywords)
    const closedWonStatuses = statuses.filter(s => 
      s.name.toLowerCase().includes('closed won') || s.name.toLowerCase().includes('won')
    );
    const closedLostStatuses = statuses.filter(s => 
      s.name.toLowerCase().includes('closed lost') || s.name.toLowerCase().includes('lost') || s.name.toLowerCase().includes('dead')
    );
    const newDealStatuses = statuses.filter(s => 
      s.name.toLowerCase().includes('new deal')
    );
    
    // Exclude Closed Won and Closed Lost from active deals (pipeline)
    const excludedStatusIds = [...closedWonStatuses, ...closedLostStatuses].map(s => s.id);

    // Calculate active deals (not in closed statuses) - this is the pipeline
    const activeDeals = deals.filter(deal => !excludedStatusIds.includes(deal.status_id)).length;

    // Calculate pipeline value (sum of active deals)
    const pipelineValue = deals
      .filter(deal => !excludedStatusIds.includes(deal.status_id))
      .reduce((sum, deal) => sum + (deal.deal_value || 0), 0);

    // Calculate average deal value (for all deals)
    const averageDealValue = totalDeals > 0 
      ? deals.reduce((sum, deal) => sum + (deal.deal_value || 0), 0) / totalDeals 
      : 0;

    // Status breakdown
    const statusBreakdown = statuses.map(status => {
      const statusDeals = deals.filter(deal => deal.status_id === status.id);
      const count = statusDeals.length;
      const value = statusDeals.reduce((sum, deal) => sum + (deal.deal_value || 0), 0);
      const percentage = totalDeals > 0 ? (count / totalDeals) * 100 : 0;
      
      return {
        statusId: status.id,
        statusName: status.name,
        statusColor: status.color,
        count,
        percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
        value,
      };
    }).sort((a, b) => b.count - a.count);

    // Recent activity calculations
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const newDealsThisWeek = deals.filter(deal => 
      new Date(deal.created_at!) >= oneWeekAgo
    ).length;

    const closedWonThisMonth = deals.filter(deal => 
      closedWonStatuses.some(s => s.id === deal.status_id) &&
      new Date(deal.updated_at!) >= oneMonthAgo
    ).length;

    const closedLostThisMonth = deals.filter(deal => 
      closedLostStatuses.some(s => s.id === deal.status_id) &&
      new Date(deal.updated_at!) >= oneMonthAgo
    ).length;

    return {
      totalDeals,
      activeDeals,
      pipelineValue,
      averageDealValue: Math.round(averageDealValue),
      statusBreakdown,
      recentActivity: {
        newDealsThisWeek,
        closedWonThisMonth,
        closedLostThisMonth,
      },
    };
  }, [dealsData?.data, statuses]);

  return {
    metrics,
    isLoading: dealsLoading || statusesLoading,
  };
}; 