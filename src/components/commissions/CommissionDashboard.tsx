import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useCommissions } from '@/hooks/useCommissions';
import { useAuth } from '@/hooks/useAuth';
import { CommissionDetails } from './CommissionDetails';
import { format, startOfMonth } from 'date-fns';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  paid: { label: 'Paid', color: 'bg-blue-100 text-blue-700' },
};

export const CommissionDashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedCommissionId, setSelectedCommissionId] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Build filters based on period
  const filters = React.useMemo(() => {
    const f: any = { agent_id: user?.id };
    if (periodFilter !== 'all') {
      const now = new Date();
      const monthsBack = parseInt(periodFilter);
      const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
      f.period_start = start.toISOString().split('T')[0];
    }
    return f;
  }, [user?.id, periodFilter]);

  const { data: commissionsResponse, isLoading } = useCommissions(filters, page, 20);
  const commissions = commissionsResponse?.data || [];
  const totalPages = commissionsResponse?.total_pages || 1;

  // Calculate summary metrics from current page (for display purposes)
  const metrics = React.useMemo(() => {
    const allCommissions = commissions;
    const thisMonth = startOfMonth(new Date()).toISOString();

    return {
      totalEarned: allCommissions
        .filter(c => c.status === 'paid' || c.status === 'approved')
        .reduce((sum, c) => sum + (c.total_commission_amount || 0), 0),
      pendingAmount: allCommissions
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + (c.total_commission_amount || 0), 0),
      approvedAmount: allCommissions
        .filter(c => c.status === 'approved')
        .reduce((sum, c) => sum + (c.total_commission_amount || 0), 0),
      thisMonthCount: allCommissions.filter(c =>
        c.created_at && c.created_at >= thisMonth
      ).length,
    };
  }, [commissions]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">My Commissions</h3>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-40 bg-white/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="1">Last Month</SelectItem>
            <SelectItem value="3">Last 3 Months</SelectItem>
            <SelectItem value="6">Last 6 Months</SelectItem>
            <SelectItem value="12">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Earned</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${metrics.totalEarned.toLocaleString()}
                </p>
              </div>
              <div className="p-2.5 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${metrics.approvedAmount.toLocaleString()}
                </p>
              </div>
              <div className="p-2.5 bg-blue-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${metrics.pendingAmount.toLocaleString()}
                </p>
              </div>
              <div className="p-2.5 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.thisMonthCount}</p>
                <p className="text-xs text-gray-500">commissions</p>
              </div>
              <div className="p-2.5 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commissions Table */}
      <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
        <CardHeader>
          <CardTitle className="text-base">Recent Commissions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : commissions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No commissions yet</p>
              <p className="text-sm mt-1">Commissions will appear here when deals are closed.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal</TableHead>
                    <TableHead className="text-right">Deal Value</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((commission) => {
                    const status = statusConfig[commission.status as keyof typeof statusConfig] || statusConfig.pending;
                    return (
                      <TableRow key={commission.id} className="cursor-pointer hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {commission.deal?.offer_title || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          ${commission.deal_value?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${commission.total_commission_amount?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={status.color}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {commission.created_at
                            ? format(new Date(commission.created_at), 'MMM d, yyyy')
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCommissionId(commission.id)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Commission Detail Dialog */}
      <Dialog
        open={!!selectedCommissionId}
        onOpenChange={(open) => !open && setSelectedCommissionId(null)}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Commission Details</DialogTitle>
          </DialogHeader>
          {selectedCommissionId && (
            <CommissionDetails commissionId={selectedCommissionId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
