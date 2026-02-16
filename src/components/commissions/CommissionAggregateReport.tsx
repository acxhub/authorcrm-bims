import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, DollarSign, TrendingUp, Users } from 'lucide-react';
import { useCommissions } from '@/hooks/useCommissions';
import { useUsersContext } from '@/contexts/UsersContext';

export const CommissionAggregateReport: React.FC = () => {
  const { activeUsers } = useUsersContext();
  const [periodFilter, setPeriodFilter] = useState('all');

  const filters = React.useMemo(() => {
    const f: any = {};
    if (periodFilter !== 'all') {
      const now = new Date();
      const monthsBack = parseInt(periodFilter);
      const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
      f.period_start = start.toISOString().split('T')[0];
    }
    return f;
  }, [periodFilter]);

  const { data: commissionsResponse, isLoading } = useCommissions(filters, 1, 1000);
  const commissions = commissionsResponse?.data || [];

  // Aggregate by agent
  const agentSummary = React.useMemo(() => {
    const summary: Record<string, {
      agentId: string;
      agentName: string;
      totalDeals: number;
      totalDealValue: number;
      totalCommission: number;
      paidCommission: number;
      pendingCommission: number;
      approvedCommission: number;
    }> = {};

    commissions.forEach(c => {
      const agentId = c.agent_id || 'unknown';
      if (!summary[agentId]) {
        const user = activeUsers.find(u => u.id === agentId);
        summary[agentId] = {
          agentId,
          agentName: c.agent_profile?.full_name || user?.full_name || 'Unknown',
          totalDeals: 0,
          totalDealValue: 0,
          totalCommission: 0,
          paidCommission: 0,
          pendingCommission: 0,
          approvedCommission: 0,
        };
      }
      const s = summary[agentId];
      s.totalDeals++;
      s.totalDealValue += c.deal_value || 0;
      s.totalCommission += c.total_commission_amount || 0;

      if (c.status === 'paid') s.paidCommission += c.total_commission_amount || 0;
      if (c.status === 'pending') s.pendingCommission += c.total_commission_amount || 0;
      if (c.status === 'approved') s.approvedCommission += c.total_commission_amount || 0;
    });

    return Object.values(summary).sort((a, b) => b.totalCommission - a.totalCommission);
  }, [commissions, activeUsers]);

  // Overall totals
  const totals = React.useMemo(() => {
    return agentSummary.reduce(
      (acc, s) => ({
        totalDeals: acc.totalDeals + s.totalDeals,
        totalDealValue: acc.totalDealValue + s.totalDealValue,
        totalCommission: acc.totalCommission + s.totalCommission,
        paidCommission: acc.paidCommission + s.paidCommission,
        pendingCommission: acc.pendingCommission + s.pendingCommission,
        approvedCommission: acc.approvedCommission + s.approvedCommission,
      }),
      {
        totalDeals: 0,
        totalDealValue: 0,
        totalCommission: 0,
        paidCommission: 0,
        pendingCommission: 0,
        approvedCommission: 0,
      }
    );
  }, [agentSummary]);

  // Company revenue (markup) totals
  const companyRevenue = React.useMemo(() => {
    return commissions.reduce((sum, c) => sum + (c.company_markup_amount || 0), 0);
  }, [commissions]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Commission Reports</h3>
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
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Commissions</p>
                <p className="text-2xl font-bold mt-1">${totals.totalCommission.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{totals.totalDeals} deals</p>
              </div>
              <div className="p-2.5 bg-blue-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Paid Out</p>
                <p className="text-2xl font-bold mt-1">${totals.paidCommission.toLocaleString()}</p>
              </div>
              <div className="p-2.5 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending + Approved</p>
                <p className="text-2xl font-bold mt-1">
                  ${(totals.pendingCommission + totals.approvedCommission).toLocaleString()}
                </p>
              </div>
              <div className="p-2.5 bg-yellow-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Company Revenue</p>
                <p className="text-2xl font-bold mt-1">${companyRevenue.toLocaleString()}</p>
                <p className="text-xs text-gray-500">from markup share</p>
              </div>
              <div className="p-2.5 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Breakdown Table */}
      <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
        <CardHeader>
          <CardTitle className="text-base">Agent Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : agentSummary.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No commission data</p>
              <p className="text-sm mt-1">Commission data will appear here when commissions are created.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Deals</TableHead>
                  <TableHead className="text-right">Deal Value</TableHead>
                  <TableHead className="text-right">Total Commission</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Approved</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentSummary.map(agent => (
                  <TableRow key={agent.agentId}>
                    <TableCell className="font-medium">{agent.agentName}</TableCell>
                    <TableCell className="text-right">{agent.totalDeals}</TableCell>
                    <TableCell className="text-right">${agent.totalDealValue.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${agent.totalCommission.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-blue-100 text-blue-700">
                        ${agent.paidCommission.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-green-100 text-green-700">
                        ${agent.approvedCommission.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-yellow-100 text-yellow-700">
                        ${agent.pendingCommission.toLocaleString()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow className="font-bold bg-gray-50">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{totals.totalDeals}</TableCell>
                  <TableCell className="text-right">${totals.totalDealValue.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${totals.totalCommission.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${totals.paidCommission.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${totals.approvedCommission.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${totals.pendingCommission.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
