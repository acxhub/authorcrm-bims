import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useCommissionsByDeal } from '@/hooks/useCommissions';
import { format } from 'date-fns';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  paid: { label: 'Paid', color: 'bg-blue-100 text-blue-700', icon: DollarSign },
};

interface DealCommissionInfoProps {
  dealId: string;
}

export const DealCommissionInfo: React.FC<DealCommissionInfoProps> = ({ dealId }) => {
  const { data: commissions, isLoading } = useCommissionsByDeal(dealId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Commission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!commissions || commissions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Commission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No commission generated for this deal yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Commission
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {commissions.map((commission) => {
          const status = statusConfig[commission.status || 'pending'] || statusConfig.pending;
          const StatusIcon = status.icon;

          return (
            <div key={commission.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge className={status.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
                <span className="text-lg font-bold text-green-600">
                  ${commission.total_commission_amount?.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Agent</p>
                  <p className="font-medium">{commission.agent_profile?.full_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Template</p>
                  <p className="font-medium">{commission.template_name || 'Custom'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Type</p>
                  <p className="font-medium capitalize">{commission.calculation_type?.replace('_', ' ') || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Created</p>
                  <p className="font-medium">
                    {commission.created_at
                      ? format(new Date(commission.created_at), 'MMM d, yyyy')
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {commission.is_overridden && (
                <div className="p-2 bg-orange-50 border border-orange-200 rounded text-sm">
                  <span className="font-medium text-orange-700">Overridden</span>
                  {commission.override_reason && (
                    <p className="text-orange-600 mt-1">{commission.override_reason}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
