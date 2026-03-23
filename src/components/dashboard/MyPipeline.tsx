import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, ArrowRight, DollarSign, AlertCircle, Clock, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, differenceInDays, startOfToday } from 'date-fns';
import { useDeals } from '@/hooks/useDeals';
import { useStatuses } from '@/hooks/useStatuses';
import { useProfile } from '@/hooks/useAuth';
import type { Deal } from '@/lib/api/deals';
import { getLeadDisplayName } from '@/lib/lead-display';

interface MyPipelineProps {
  userId?: string;
}

interface DealRowProps {
  deal: Deal;
  navigate: (path: string) => void;
  urgency: 'urgent' | 'warning' | 'good';
}

const DealRow: React.FC<DealRowProps> = ({ deal, navigate, urgency }) => {
  const borderColors = {
    urgent: 'border-l-red-400 bg-red-50/50',
    warning: 'border-l-orange-400 bg-orange-50/50',
    good: 'border-l-green-400 bg-white/40'
  };

  return (
    <button
      onClick={() => navigate(`/deals/${deal.id}`)}
      className={`flex items-center justify-between w-full p-3 rounded-lg border border-gray-200/40 border-l-4 ${borderColors[urgency]} hover:bg-white/80 hover:border-gray-300/60 transition-all text-left group`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700">
            {deal.offer_title || 'Untitled Deal'}
          </p>
          <Badge 
            variant="outline" 
            className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0"
            style={{ 
              backgroundColor: `${deal.status?.color}15`,
              borderColor: deal.status?.color,
              color: deal.status?.color
            }}
          >
            {deal.status?.name}
          </Badge>
        </div>
        <p className="text-xs text-gray-500 truncate">
          {deal.lead ? getLeadDisplayName(deal.lead) : 'No lead'}
          {deal.updated_at && (
            <span className="ml-2 text-gray-400">
              {formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true })}
            </span>
          )}
        </p>
      </div>
      {deal.deal_value != null && deal.deal_value > 0 && (
        <Badge variant="outline" className="ml-3 text-green-600 border-green-200 bg-green-50 flex-shrink-0">
          <DollarSign className="h-3 w-3 mr-0.5" />
          {deal.deal_value.toLocaleString()}
        </Badge>
      )}
    </button>
  );
};

export const MyPipeline: React.FC<MyPipelineProps> = ({ userId }) => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const isAgent = profile?.role === 'sales';

  const filters = isAgent && userId ? { assigned_to: userId } : {};
  const { data: dealsData, isLoading: dealsLoading } = useDeals(filters, 1, 100);
  const { data: statuses = [], isLoading: statusesLoading } = useStatuses();

  const deals = dealsData?.data || [];

  // Filter out closed deals
  const activeDeals = useMemo(() => {
    return deals.filter(deal => {
      const statusName = deal.status?.name?.toLowerCase() || '';
      return !statusName.includes('closed') && !statusName.includes('lost') && !statusName.includes('dead');
    });
  }, [deals]);

  // Group by urgency instead of status
  const groupedByUrgency = useMemo(() => {
    const today = startOfToday();
    const urgent: Deal[] = []; // No activity 14+ days
    const needsAction: Deal[] = []; // No activity 7-13 days  
    const onTrack: Deal[] = []; // Activity within 7 days

    for (const deal of activeDeals) {
      const lastUpdate = new Date(deal.updated_at!);
      const daysSinceUpdate = differenceInDays(today, lastUpdate);

      if (daysSinceUpdate >= 14) {
        urgent.push(deal);
      } else if (daysSinceUpdate >= 7) {
        needsAction.push(deal);
      } else {
        onTrack.push(deal);
      }
    }

    // Sort each group by deal value (highest first)
    const sortByValue = (a: Deal, b: Deal) => (b.deal_value || 0) - (a.deal_value || 0);
    urgent.sort(sortByValue);
    needsAction.sort(sortByValue);
    onTrack.sort(sortByValue);

    return { urgent, needsAction, onTrack };
  }, [activeDeals]);

  // Keep the old grouped view for reference but use urgency view by default
  const groupedDeals = useMemo(() => {
    const groups: { status: { id: string; name: string; color: string; order_index: number }; deals: Deal[] }[] = [];
    const statusMap = new Map<string, Deal[]>();

    for (const deal of activeDeals) {
      const statusId = deal.status_id;
      if (!statusMap.has(statusId)) {
        statusMap.set(statusId, []);
      }
      statusMap.get(statusId)!.push(deal);
    }

    for (const status of statuses) {
      const statusDeals = statusMap.get(status.id);
      if (statusDeals && statusDeals.length > 0) {
        groups.push({ status, deals: statusDeals });
      }
    }

    groups.sort((a, b) => a.status.order_index - b.status.order_index);
    return groups;
  }, [activeDeals, statuses]);

  const totalValue = useMemo(() => {
    return activeDeals.reduce((sum, d) => sum + (d.deal_value || 0), 0);
  }, [activeDeals]);

  const isLoading = dealsLoading || statusesLoading;

  if (isLoading) {
    return (
      <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{isAgent ? 'My Pipeline' : 'Pipeline Overview'}</CardTitle>
              <p className="text-sm text-gray-500">
                {activeDeals.length} active deal{activeDeals.length !== 1 ? 's' : ''}
                {totalValue > 0 && (
                  <span className="ml-2 text-green-600 font-medium">
                    ${totalValue.toLocaleString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/pipeline')}>
            View Pipeline <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activeDeals.length === 0 ? (
          <div className="text-center py-8">
            <Target className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-3">No active deals in your pipeline</p>
            <Button size="sm" variant="outline" onClick={() => navigate('/pipeline')}>
              Go to Pipeline
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Urgent - 14+ days stale */}
            {groupedByUrgency.urgent.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="h-4 w-4 text-red-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-red-600">
                    Urgent - Stale 14+ days
                  </span>
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                    {groupedByUrgency.urgent.length}
                  </Badge>
                </div>
                <div className="space-y-1.5 ml-6">
                  {groupedByUrgency.urgent.slice(0, 3).map((deal) => (
                    <DealRow key={deal.id} deal={deal} navigate={navigate} urgency="urgent" />
                  ))}
                  {groupedByUrgency.urgent.length > 3 && (
                    <p className="text-xs text-gray-500 pl-3">+{groupedByUrgency.urgent.length - 3} more</p>
                  )}
                </div>
              </div>
            )}

            {/* Needs Action - 7-13 days */}
            {groupedByUrgency.needsAction.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-orange-600">
                    Needs Action - 7+ days
                  </span>
                  <Badge className="text-[10px] px-1.5 py-0 h-4 bg-orange-100 text-orange-700">
                    {groupedByUrgency.needsAction.length}
                  </Badge>
                </div>
                <div className="space-y-1.5 ml-6">
                  {groupedByUrgency.needsAction.slice(0, 3).map((deal) => (
                    <DealRow key={deal.id} deal={deal} navigate={navigate} urgency="warning" />
                  ))}
                  {groupedByUrgency.needsAction.length > 3 && (
                    <p className="text-xs text-gray-500 pl-3">+{groupedByUrgency.needsAction.length - 3} more</p>
                  )}
                </div>
              </div>
            )}

            {/* On Track - Recent activity */}
            {groupedByUrgency.onTrack.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-green-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-green-600">
                    On Track
                  </span>
                  <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-100 text-green-700">
                    {groupedByUrgency.onTrack.length}
                  </Badge>
                </div>
                <div className="space-y-1.5 ml-6">
                  {groupedByUrgency.onTrack.slice(0, 4).map((deal) => (
                    <DealRow key={deal.id} deal={deal} navigate={navigate} urgency="good" />
                  ))}
                  {groupedByUrgency.onTrack.length > 4 && (
                    <p className="text-xs text-gray-500 pl-3">+{groupedByUrgency.onTrack.length - 4} more</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
