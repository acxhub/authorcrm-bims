import React, { useState } from 'react';
import { Users, UserX, AlertCircle, Clock, Tag, UserMinus, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LeadManagerMetrics } from '@/lib/api/leadManagerMetrics';
import { LeadsModal } from './LeadsModal';

interface LeadManagerStatsProps {
  metrics: LeadManagerMetrics | undefined;
  isLoading: boolean;
}

type ModalType = 'total' | 'unassigned' | 'never-touched' | 'went-cold' | 'no-tags' | 'orphaned' | null;

export const LeadManagerStats: React.FC<LeadManagerStatsProps> = ({ metrics, isLoading }) => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const stats = [
    {
      id: 'total' as ModalType,
      label: 'Total Active Leads',
      value: metrics?.totalActiveLeads || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      id: 'unassigned' as ModalType,
      label: 'Unassigned Leads',
      value: metrics?.unassignedLeads || 0,
      icon: UserX,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      alert: (metrics?.unassignedLeads || 0) > 50,
    },
    {
      id: 'never-touched' as ModalType,
      label: 'Never Touched',
      value: metrics?.neverTouchedLeads || 0,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      alert: (metrics?.neverTouchedLeads || 0) > 100,
    },
    {
      id: 'went-cold' as ModalType,
      label: 'Went Cold (60+ days)',
      value: metrics?.wentColdLeads || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      alert: (metrics?.wentColdLeads || 0) > 200,
    },
    {
      id: 'no-tags' as ModalType,
      label: 'Without Tags',
      value: metrics?.leadsWithoutTags || 0,
      icon: Tag,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
    },
    {
      id: 'orphaned' as ModalType,
      label: 'Orphaned Leads',
      value: metrics?.orphanedLeads || 0,
      icon: UserMinus,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      alert: (metrics?.orphanedLeads || 0) > 0,
    },
    {
      id: null,
      label: 'Avg Leads/Agent',
      value: metrics?.averageLeadsPerAgent || 0,
      icon: BarChart3,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      suffix: ` (${metrics?.activeAgentCount || 0} agents)`,
      clickable: false,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i} className="border">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isClickable = stat.clickable !== false && stat.id !== null;
          
          return (
            <Card
              key={stat.label}
              className={`border ${stat.borderColor} ${isClickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${stat.alert ? 'ring-2 ring-red-300' : ''}`}
              onClick={() => isClickable && setActiveModal(stat.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>
                      {stat.value.toLocaleString()}
                      {stat.suffix && (
                        <span className="text-sm font-normal text-muted-foreground">
                          {stat.suffix}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <LeadsModal
        open={activeModal === 'unassigned'}
        onClose={() => setActiveModal(null)}
        title="Unassigned Leads"
        description={`${metrics?.unassignedLeads || 0} leads without an assigned agent`}
        filterType="unassigned"
      />

      <LeadsModal
        open={activeModal === 'never-touched'}
        onClose={() => setActiveModal(null)}
        title="Never Touched Leads"
        description={`${metrics?.neverTouchedLeads || 0} leads with zero activities`}
        filterType="never-touched"
      />

      <LeadsModal
        open={activeModal === 'went-cold'}
        onClose={() => setActiveModal(null)}
        title="Went Cold Leads"
        description={`${metrics?.wentColdLeads || 0} leads with no activity in 60+ days`}
        filterType="went-cold"
        staleDays={60}
      />

      <LeadsModal
        open={activeModal === 'no-tags'}
        onClose={() => setActiveModal(null)}
        title="Leads Without Tags"
        description={`${metrics?.leadsWithoutTags || 0} leads without any tags`}
        filterType="no-tags"
      />

      <LeadsModal
        open={activeModal === 'orphaned'}
        onClose={() => setActiveModal(null)}
        title="Orphaned Leads"
        description={`${metrics?.orphanedLeads || 0} leads assigned to inactive agents`}
        filterType="orphaned"
      />
    </>
  );
};
