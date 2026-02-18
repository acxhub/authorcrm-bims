import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus, TrendingUp, Trophy, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickStat {
  id: string;
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  filterKey: string;
  filterValue: any;
}

interface LeadsQuickStatsProps {
  stats: {
    newLead: number;
    inPipeline: number;
    closedWon: number;
    untouched: number;
  };
  isLoading: boolean;
  activeFilter: string | null;
  onFilterClick: (filterKey: string, filterValue: any) => void;
}

export const LeadsQuickStats: React.FC<LeadsQuickStatsProps> = ({
  stats,
  isLoading,
  activeFilter,
  onFilterClick,
}) => {
  const quickStats: QuickStat[] = [
    {
      id: 'new-lead',
      label: 'New Lead',
      count: stats.newLead,
      icon: <UserPlus className="h-5 w-5" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100 border-green-200',
      filterKey: 'statusFilter',
      filterValue: 'new-lead',
    },
    {
      id: 'in-pipeline',
      label: 'In Pipeline',
      count: stats.inPipeline,
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
      filterKey: 'inPipeline',
      filterValue: true,
    },
    {
      id: 'closed-won',
      label: 'Closed Won',
      count: stats.closedWon,
      icon: <Trophy className="h-5 w-5" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
      filterKey: 'statusFilter',
      filterValue: 'closed-won',
    },
    {
      id: 'untouched',
      label: 'Untouched',
      count: stats.untouched,
      icon: <AlertCircle className="h-5 w-5" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
      filterKey: 'noActivities',
      filterValue: true,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-5 w-5 mb-2" />
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-4 w-20" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {quickStats.map((stat) => {
        const isActive = activeFilter === stat.id;
        return (
          <Card
            key={stat.id}
            className={cn(
              'p-4 cursor-pointer transition-all duration-200 border-2',
              stat.bgColor,
              isActive && 'ring-2 ring-offset-2 ring-blue-500 shadow-md'
            )}
            onClick={() => onFilterClick(stat.filterKey, isActive ? null : stat.filterValue)}
          >
            <div className={cn('mb-2', stat.color)}>{stat.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{stat.count.toLocaleString()}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
            {isActive && (
              <div className="text-xs text-blue-600 mt-1 font-medium">Click to clear filter</div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
