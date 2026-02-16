import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Clock, CheckCircle, XCircle, DollarSign, AlertTriangle } from 'lucide-react';
import { useCommission, useCommissionAuditLog } from '@/hooks/useCommissions';
import { format } from 'date-fns';
import type { TierBreakdownEntry } from '@/lib/api/commission-calculator';

interface CommissionDetailsProps {
  commissionId: string;
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  paid: { label: 'Paid', color: 'bg-blue-100 text-blue-700', icon: DollarSign },
};

export const CommissionDetails: React.FC<CommissionDetailsProps> = ({ commissionId }) => {
  const { data: commission, isLoading } = useCommission(commissionId);
  const { data: auditLog } = useCommissionAuditLog(commissionId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!commission) {
    return <p className="text-center text-gray-500 py-8">Commission not found.</p>;
  }

  const status = statusConfig[commission.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;
  const tierBreakdown = (commission.tier_breakdown as unknown as TierBreakdownEntry[]) || [];

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Commission Details
            </CardTitle>
            <Badge className={status.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500">Deal</p>
              <p className="font-semibold">{commission.deal?.offer_title || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Agent</p>
              <p className="font-semibold">{commission.agent_profile?.full_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Deal Value</p>
              <p className="font-semibold">${commission.deal_value?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Commission</p>
              <p className="font-semibold text-green-600">
                ${commission.total_commission_amount?.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Template</p>
              <p className="font-semibold">{commission.template_name || 'Custom'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Calculation Type</p>
              <Badge variant="outline" className="mt-1">
                {commission.calculation_type || 'N/A'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">Period</p>
              <p className="font-semibold">
                {commission.commission_period
                  ? format(new Date(commission.commission_period), 'MMM yyyy')
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="font-semibold">
                {commission.created_at
                  ? format(new Date(commission.created_at), 'MMM d, yyyy')
                  : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Markup Split */}
      {(commission.markup_amount ?? 0) > 0 && (
        <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
          <CardHeader>
            <CardTitle className="text-base">Markup Split</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Markup</p>
                <p className="text-lg font-bold">${(commission.markup_amount ?? 0).toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-500">Agent Portion ({commission.markup_commissionable_percent}%)</p>
                <p className="text-lg font-bold text-green-600">
                  ${(commission.markup_commission_amount ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-500">Company Portion</p>
                <p className="text-lg font-bold text-blue-600">
                  ${(commission.company_markup_amount ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tier Breakdown */}
      {tierBreakdown.length > 0 && (
        <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
          <CardHeader>
            <CardTitle className="text-base">Tier Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier Range</TableHead>
                  <TableHead className="text-right">Amount in Tier</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tierBreakdown.map((entry, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{entry.tier}</TableCell>
                    <TableCell className="text-right">${entry.amount?.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{entry.percent}%</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${entry.commission?.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Override Info */}
      {commission.is_overridden && (
        <Card className="bg-orange-50/60 backdrop-blur-sm border-orange-200/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Commission Override
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Override Amount</p>
                <p className="font-semibold">${commission.override_amount?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Overridden By</p>
                <p className="font-semibold">{commission.overridden_by_profile?.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-semibold">
                  {commission.overridden_at
                    ? format(new Date(commission.overridden_at), 'MMM d, yyyy HH:mm')
                    : 'N/A'}
                </p>
              </div>
            </div>
            {commission.override_reason && (
              <div className="mt-3 p-3 bg-white/60 rounded border">
                <p className="text-sm text-gray-500">Reason</p>
                <p className="text-sm">{commission.override_reason}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Audit Log */}
      {auditLog && auditLog.length > 0 && (
        <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
          <CardHeader>
            <CardTitle className="text-base">Audit Trail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditLog.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {entry.action}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        by {entry.performed_by_profile?.full_name || 'System'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {entry.created_at
                          ? format(new Date(entry.created_at), 'MMM d, yyyy HH:mm')
                          : ''}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
