import { useMemo } from 'react';
import { useLeads } from './useLeads';
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

export const usePipelineMetrics = () => {
  const { data: leadsData, isLoading: leadsLoading } = useLeads({}, 1, 1000);
  const { data: statuses, isLoading: statusesLoading } = useStatuses();

  const metrics = useMemo((): PipelineMetrics => {
    if (!leadsData?.data || !statuses) {
      return {
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
    }

    const leads = leadsData.data;
    const totalLeads = leads.length;

    // Find closed statuses (assuming "Closed Won" and "Closed Lost" contain these keywords)
    const closedWonStatuses = statuses.filter(s => 
      s.name.toLowerCase().includes('closed won') || s.name.toLowerCase().includes('won')
    );
    const closedLostStatuses = statuses.filter(s => 
      s.name.toLowerCase().includes('closed lost') || s.name.toLowerCase().includes('lost') || s.name.toLowerCase().includes('dead')
    );
    const newLeadStatuses = statuses.filter(s => 
      s.name.toLowerCase().includes('new lead')
    );
    
    // Exclude New Lead, Closed Won, and Closed Lost from active leads
    const excludedStatusIds = [...closedWonStatuses, ...closedLostStatuses, ...newLeadStatuses].map(s => s.id);

    // Calculate active leads (not in excluded statuses)
    const activeLeads = leads.filter(lead => !excludedStatusIds.includes(lead.status_id)).length;

    // Calculate conversion rate (closed won / total leads)
    const closedWonLeads = leads.filter(lead => 
      closedWonStatuses.some(s => s.id === lead.status_id)
    ).length;
    const conversionRate = totalLeads > 0 ? (closedWonLeads / totalLeads) * 100 : 0;

    // Calculate average time to close (for closed leads)
    const closedStatusIds = [...closedWonStatuses, ...closedLostStatuses].map(s => s.id);
    const closedLeads = leads.filter(lead => closedStatusIds.includes(lead.status_id));
    let averageTimeToClose = 0;
    
    if (closedLeads.length > 0) {
      const totalDays = closedLeads.reduce((sum, lead) => {
        const createdDate = new Date(lead.created_at!);
        const updatedDate = new Date(lead.updated_at!);
        const daysDiff = Math.ceil((updatedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        return sum + daysDiff;
      }, 0);
      averageTimeToClose = Math.round(totalDays / closedLeads.length);
    }

    // Status breakdown
    const statusBreakdown = statuses.map(status => {
      const count = leads.filter(lead => lead.status_id === status.id).length;
      const percentage = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
      
      return {
        statusId: status.id,
        statusName: status.name,
        statusColor: status.color,
        count,
        percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
      };
    }).sort((a, b) => b.count - a.count);

    // Recent activity calculations
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const newLeadsThisWeek = leads.filter(lead => 
      new Date(lead.created_at!) >= oneWeekAgo
    ).length;

    const closedWonThisMonth = leads.filter(lead => 
      closedWonStatuses.some(s => s.id === lead.status_id) &&
      new Date(lead.updated_at!) >= oneMonthAgo
    ).length;

    const closedLostThisMonth = leads.filter(lead => 
      closedLostStatuses.some(s => s.id === lead.status_id) &&
      new Date(lead.updated_at!) >= oneMonthAgo
    ).length;

    return {
      totalLeads,
      activeLeads,
      conversionRate: Math.round(conversionRate * 10) / 10, // Round to 1 decimal
      averageTimeToClose,
      statusBreakdown,
      recentActivity: {
        newLeadsThisWeek,
        closedWonThisMonth,
        closedLostThisMonth,
      },
    };
  }, [leadsData?.data, statuses]);

  return {
    metrics,
    isLoading: leadsLoading || statusesLoading,
  };
}; 