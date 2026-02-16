import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, DollarSign, Edit, Filter } from 'lucide-react';
import {
  useCommissions,
  useApproveCommission,
  useRejectCommission,
  useOverrideCommission,
  useBulkApproveCommissions,
  useMarkCommissionPaid,
} from '@/hooks/useCommissions';
import { useAuth } from '@/hooks/useAuth';
import { useUsersContext } from '@/contexts/UsersContext';
import { formatDistanceToNow } from 'date-fns';

const statusBadgeColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  paid: 'bg-blue-100 text-blue-700',
};

export const CommissionApprovalQueue: React.FC = () => {
  const { user } = useAuth();
  const { activeUsers } = useUsersContext();

  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideCommissionData, setOverrideCommissionData] = useState<{ id: string; amount: string } | null>(null);
  const [overrideAmount, setOverrideAmount] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectCommissionId, setRejectCommissionId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const filters: any = {};
  if (agentFilter !== 'all') filters.agent_id = agentFilter;
  if (statusFilter !== 'all') filters.status = statusFilter;

  const { data: commissionsData, isLoading } = useCommissions(filters, page, 20);
  const commissions = commissionsData?.data || [];
  const totalPages = commissionsData?.total_pages || 1;

  const approveMutation = useApproveCommission();
  const rejectMutation = useRejectCommission();
  const overrideMutation = useOverrideCommission();
  const bulkApproveMutation = useBulkApproveCommissions();
  const markPaidMutation = useMarkCommissionPaid();

  const pendingCommissions = commissions.filter(c => c.status === 'pending');
  const totalPendingAmount = pendingCommissions.reduce((sum, c) => sum + (c.total_commission_amount || 0), 0);
  const approvedCommissions = commissions.filter(c => c.status === 'approved');
  const totalApprovedAmount = approvedCommissions.reduce((sum, c) => sum + (c.total_commission_amount || 0), 0);

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? commissions.map(c => c.id) : []);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(checked
      ? [...selectedIds, id]
      : selectedIds.filter(sid => sid !== id)
    );
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0 || !user?.id) return;
    await bulkApproveMutation.mutateAsync({ ids: selectedIds, approvedBy: user.id });
    setSelectedIds([]);
  };

  const handleApprove = async (id: string) => {
    if (!user?.id) return;
    await approveMutation.mutateAsync({ id, approvedBy: user.id });
  };

  const handleOpenReject = (id: string) => {
    setRejectCommissionId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!rejectCommissionId || !rejectReason.trim() || !user?.id) return;
    await rejectMutation.mutateAsync({
      id: rejectCommissionId,
      reason: rejectReason,
      rejectedBy: user.id,
    });
    setRejectModalOpen(false);
    setRejectCommissionId(null);
    setRejectReason('');
  };

  const handleOpenOverride = (commission: any) => {
    setOverrideCommissionData({ id: commission.id, amount: commission.total_commission_amount?.toString() || '0' });
    setOverrideAmount(commission.total_commission_amount?.toString() || '');
    setOverrideReason('');
    setOverrideModalOpen(true);
  };

  const handleOverride = async () => {
    if (!overrideCommissionData || !overrideAmount || !overrideReason.trim() || !user?.id) return;
    await overrideMutation.mutateAsync({
      id: overrideCommissionData.id,
      amount: parseFloat(overrideAmount),
      reason: overrideReason,
      overriddenBy: user.id,
    });
    setOverrideModalOpen(false);
    setOverrideCommissionData(null);
    setOverrideAmount('');
    setOverrideReason('');
  };

  const handleMarkPaid = async (id: string) => {
    if (!user?.id) return;
    await markPaidMutation.mutateAsync({ id, paidBy: user.id });
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {activeUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCommissions.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Pending Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPendingAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Approved Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalApprovedAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <Card className="bg-blue-50/60 backdrop-blur-sm border-blue-200/60">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedIds.length} commission{selectedIds.length > 1 ? 's' : ''} selected
              </span>
              <Button onClick={handleBulkApprove} disabled={bulkApproveMutation.isPending} size="sm">
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Selected
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
        <CardHeader>
          <CardTitle>Commission Approval Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : commissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No commissions match the selected filters.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.length === commissions.length && commissions.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Deal</TableHead>
                    <TableHead className="text-right">Deal Value</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(commission.id)}
                          onCheckedChange={(checked) => handleSelectOne(commission.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {commission.agent_profile?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell>{commission.deal?.offer_title || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        ${commission.deal_value?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${commission.total_commission_amount?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadgeColors[commission.status || 'pending'] || ''}>
                          {commission.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {commission.created_at
                          ? formatDistanceToNow(new Date(commission.created_at), { addSuffix: true })
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {commission.status === 'pending' && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => handleApprove(commission.id)} title="Approve">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleOpenReject(commission.id)} title="Reject">
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleOpenOverride(commission)} title="Override">
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                          {commission.status === 'approved' && (
                            <Button size="sm" variant="ghost" onClick={() => handleMarkPaid(commission.id)} title="Mark Paid">
                              <DollarSign className="h-4 w-4 text-purple-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Override Modal */}
      <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Commission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="override-amount">New Commission Amount ($)</Label>
              <Input
                id="override-amount"
                type="number"
                step="0.01"
                value={overrideAmount}
                onChange={(e) => setOverrideAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="override-reason">Reason (Required)</Label>
              <Textarea
                id="override-reason"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Explain why this commission is being overridden..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideModalOpen(false)}>Cancel</Button>
            <Button onClick={handleOverride} disabled={!overrideAmount || !overrideReason.trim() || overrideMutation.isPending}>
              Apply Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Commission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Rejection Reason (Required)</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this commission is being rejected..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim() || rejectMutation.isPending}>
              Reject Commission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
