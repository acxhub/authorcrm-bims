import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Clock, 
  UserX, 
  TrendingDown,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useProfile } from '@/hooks/useAuth';
import { useDeals } from '@/hooks/useDeals';
import { useLeads } from '@/hooks/useLeads';
import { useReminders } from '@/hooks/useReminders';
import { differenceInDays, startOfToday, isBefore } from 'date-fns';

interface AttentionItemProps {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  bgColor: string;
  title: string;
  description: string;
  count: number;
  onClick: () => void;
}

const AttentionItem: React.FC<AttentionItemProps> = ({
  icon: Icon,
  iconColor,
  bgColor,
  title,
  description,
  count,
  onClick
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-4 w-full p-4 rounded-xl ${bgColor} hover:shadow-md transition-all group text-left`}
  >
    <div className={`p-2.5 rounded-lg ${iconColor}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-900">{title}</span>
        <Badge variant="secondary" className="bg-white/80 text-gray-700 font-bold">
          {count}
        </Badge>
      </div>
      <p className="text-sm text-gray-600 truncate">{description}</p>
    </div>
    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
  </button>
);

export const NeedsAttention: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const isAgent = profile?.role === 'sales';

  const filters = isAgent && user?.id ? { assigned_to: user.id } : {};
  const { data: dealsData } = useDeals(filters, 1, 500);
  const { data: leadsData } = useLeads(filters, 1, 500);
  const { data: remindersData } = useReminders(
    { user_id: user?.id || '' },
    1,
    100
  );

  const attentionItems = useMemo(() => {
    const items: AttentionItemProps[] = [];
    const today = startOfToday();
    const deals = dealsData?.data || [];
    const leads = leadsData?.data || [];
    const reminders = remindersData?.data || [];

    // 1. Overdue reminders
    const overdueReminders = reminders.filter(r => 
      !r.is_completed && 
      r.due_date && 
      isBefore(new Date(r.due_date + 'T00:00:00'), today)
    );
    
    if (overdueReminders.length > 0) {
      items.push({
        icon: Clock,
        iconColor: 'bg-red-100 text-red-600',
        bgColor: 'bg-red-50 border border-red-100',
        title: 'Overdue Tasks',
        description: `${overdueReminders.length} task${overdueReminders.length !== 1 ? 's' : ''} past due date`,
        count: overdueReminders.length,
        onClick: () => navigate('/reminders')
      });
    }

    // 2. Stale deals (no update in 14+ days, not closed)
    const staleDeals = deals.filter(d => {
      const statusName = d.status?.name?.toLowerCase() || '';
      if (statusName.includes('closed') || statusName.includes('lost') || statusName.includes('dead')) {
        return false;
      }
      const lastUpdate = new Date(d.updated_at!);
      return differenceInDays(today, lastUpdate) >= 14;
    });

    if (staleDeals.length > 0) {
      items.push({
        icon: TrendingDown,
        iconColor: 'bg-orange-100 text-orange-600',
        bgColor: 'bg-orange-50 border border-orange-100',
        title: 'Stale Deals',
        description: `No activity in 14+ days`,
        count: staleDeals.length,
        onClick: () => navigate('/pipeline?view=table&filter=stale')
      });
    }

    // 3. Unassigned leads (managers only)
    if (!isAgent) {
      const unassignedLeads = leads.filter(l => !l.assigned_to);
      if (unassignedLeads.length > 0) {
        items.push({
          icon: UserX,
          iconColor: 'bg-yellow-100 text-yellow-600',
          bgColor: 'bg-yellow-50 border border-yellow-100',
          title: 'Unassigned Leads',
          description: `Leads waiting for assignment`,
          count: unassignedLeads.length,
          onClick: () => navigate('/leads?filter=unassigned')
        });
      }
    }

    // 4. Deals stuck in early stages (7+ days in New Lead or Contacted)
    const stuckDeals = deals.filter(d => {
      const statusName = d.status?.name?.toLowerCase() || '';
      if (!statusName.includes('new') && !statusName.includes('contacted')) {
        return false;
      }
      const created = new Date(d.created_at!);
      return differenceInDays(today, created) >= 7;
    });

    if (stuckDeals.length > 0) {
      items.push({
        icon: AlertTriangle,
        iconColor: 'bg-purple-100 text-purple-600',
        bgColor: 'bg-purple-50 border border-purple-100',
        title: 'Deals Need Progress',
        description: `Stuck in early stages 7+ days`,
        count: stuckDeals.length,
        onClick: () => navigate('/pipeline?view=table&filter=stuck')
      });
    }

    return items;
  }, [dealsData, leadsData, remindersData, isAgent, navigate]);

  if (attentionItems.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/60">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900">All caught up!</h3>
              <p className="text-sm text-green-700">No items need your immediate attention</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Needs Attention</CardTitle>
            <p className="text-sm text-gray-500">
              {attentionItems.reduce((sum, item) => sum + item.count, 0)} items require action
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {attentionItems.map((item, index) => (
          <AttentionItem key={index} {...item} />
        ))}
      </CardContent>
    </Card>
  );
};
