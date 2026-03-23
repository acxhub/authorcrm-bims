import React, { useState, useMemo } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, Download, Filter, Users, Calendar } from 'lucide-react';
import { useAuth, useProfile } from '@/hooks/useAuth';
import { useAttendanceShiftsManilaRange } from '@/hooks/useAttendance';
import { useUsersContext } from '@/contexts/UsersContext';
import {
  shiftGrossSeconds,
  shiftNetWorkedSeconds,
  formatDurationSeconds,
} from '@/lib/attendanceUtils';
import {
  formatManilaDateTime,
  formatManilaTime,
  manilaTodayYmd,
  toManilaYmd,
} from '@/lib/timezone';
import type { AttendanceShift } from '@/lib/api/attendance';

const statusConfig = {
  active: { label: 'Active', color: 'bg-green-100 text-green-700' },
  on_break: { label: 'On Break', color: 'bg-yellow-100 text-yellow-700' },
  clocked_out: { label: 'Completed', color: 'bg-gray-100 text-gray-600' },
} as const;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function exportCSV(shifts: AttendanceShift[]) {
  const headers = ['User', 'Date (Manila)', 'Clock In', 'Clock Out', 'Gross Duration', 'Break Total', 'Net Worked', 'Status'];
  const rows = shifts.map((s) => {
    const name = s.user_profile?.full_name || s.user_profile?.email || 'Unknown';
    const dateKey = toManilaYmd(s.clock_in_at);
    const clockIn = formatManilaDateTime(s.clock_in_at);
    const clockOut = s.clock_out_at ? formatManilaDateTime(s.clock_out_at) : '—';
    const gross = formatDurationSeconds(shiftGrossSeconds(s));
    const breakTotal = formatDurationSeconds(s.total_break_seconds);
    const net = formatDurationSeconds(shiftNetWorkedSeconds(s));
    const status = statusConfig[s.status]?.label || s.status;
    return [name, dateKey, clockIn, clockOut, gross, breakTotal, net, status];
  });

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `attendance_report_${manilaTodayYmd()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export const AttendanceReportPage: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { activeUsers } = useUsersContext();

  const today = manilaTodayYmd();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');

  const userId = selectedUserId === 'all' ? undefined : selectedUserId;
  const { data, isLoading } = useAttendanceShiftsManilaRange(fromDate, toDate, userId, 1, 200);
  const shifts = data?.data || [];
  const totalCount = data?.count || 0;

  // Summary stats
  const summary = useMemo(() => {
    let totalNet = 0;
    let totalBreak = 0;
    let completedCount = 0;
    const uniqueUsers = new Set<string>();

    for (const s of shifts) {
      totalNet += shiftNetWorkedSeconds(s);
      totalBreak += s.total_break_seconds;
      if (s.status === 'clocked_out') completedCount++;
      uniqueUsers.add(s.user_id);
    }

    return {
      totalNet,
      totalBreak,
      completedCount,
      activeCount: shifts.filter((s) => s.status !== 'clocked_out').length,
      uniqueUsers: uniqueUsers.size,
    };
  }, [shifts]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 to-blue-50">
        <AppSidebar />

        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="h-8 w-8" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Attendance Report</h1>
                  <p className="text-sm text-gray-600">
                    Team attendance logs grouped by Manila date of clock-in
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <NotificationBell />
                {shifts.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportCSV(shifts)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                )}
              </div>
            </div>
          </header>

          <main className="p-6 space-y-6">
            {/* Filters */}
            <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                    <Filter className="h-4 w-4 text-white" />
                  </div>
                  <CardTitle className="text-base">Filters</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500">From Date (Manila)</Label>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      max={toDate}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500">To Date (Manila)</Label>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      min={fromDate}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500">User</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {activeUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.full_name || u.email || u.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Shifts</p>
                </CardContent>
              </Card>
              <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{summary.uniqueUsers}</p>
                  <p className="text-xs text-gray-500 mt-1">Unique Users</p>
                </CardContent>
              </Card>
              <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{formatDurationSeconds(summary.totalNet)}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Worked</p>
                </CardContent>
              </Card>
              <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-2xl font-bold text-yellow-700">{formatDurationSeconds(summary.totalBreak)}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Breaks</p>
                </CardContent>
              </Card>
            </div>

            {/* Shifts Table */}
            <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                    <CardTitle className="text-base">Shift Records</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {totalCount} record{totalCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : shifts.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No attendance records found for the selected filters.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Date (Manila)</TableHead>
                          <TableHead>Clock In</TableHead>
                          <TableHead>Clock Out</TableHead>
                          <TableHead className="text-right">Gross</TableHead>
                          <TableHead className="text-right">Breaks</TableHead>
                          <TableHead className="text-right">Net Worked</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shifts.map((shift) => {
                          const name = shift.user_profile?.full_name || shift.user_profile?.email || 'Unknown';
                          const dateKey = toManilaYmd(shift.clock_in_at);
                          const gross = shiftGrossSeconds(shift);
                          const net = shiftNetWorkedSeconds(shift);
                          const cfg = statusConfig[shift.status] || statusConfig.clocked_out;

                          return (
                            <TableRow key={shift.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-7 w-7">
                                    <AvatarFallback className="text-[10px] bg-blue-50 text-blue-700">
                                      {getInitials(name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm font-medium truncate max-w-[140px]">{name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">{dateKey}</TableCell>
                              <TableCell className="text-sm">{formatManilaTime(shift.clock_in_at)}</TableCell>
                              <TableCell className="text-sm">
                                {shift.clock_out_at ? formatManilaTime(shift.clock_out_at) : '—'}
                              </TableCell>
                              <TableCell className="text-sm text-right font-mono">
                                {formatDurationSeconds(gross)}
                              </TableCell>
                              <TableCell className="text-sm text-right font-mono text-yellow-700">
                                {shift.total_break_seconds > 0 ? formatDurationSeconds(shift.total_break_seconds) : '—'}
                              </TableCell>
                              <TableCell className="text-sm text-right font-mono font-medium">
                                {formatDurationSeconds(net)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>
                                  {cfg.label}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AttendanceReportPage;
