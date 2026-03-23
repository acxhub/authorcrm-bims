import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Clock,
  LogIn,
  LogOut,
  Coffee,
  Play,
  Users,
  AlertCircle,
  History,
} from 'lucide-react';
import { useAuth, useProfile } from '@/hooks/useAuth';
import {
  useAttendanceOpenShift,
  useAttendanceClockIn,
  useAttendanceClockOut,
  useAttendanceStartBreak,
  useAttendanceEndBreak,
  useAttendanceOpenShiftsTeam,
  useAttendanceShiftsManilaRange,
} from '@/hooks/useAttendance';
import {
  findOpenBreak,
  shiftNetWorkedSeconds,
  shiftGrossSeconds,
  openBreakElapsedSeconds,
  formatDurationSeconds,
} from '@/lib/attendanceUtils';
import { formatManilaTime, toManilaYmd, manilaTodayYmd } from '@/lib/timezone';
import type { AttendanceShift } from '@/lib/api/attendance';

const statusConfig = {
  active: { label: 'Working', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  on_break: { label: 'On Break', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  clocked_out: { label: 'Clocked Out', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
} as const;

function LiveTimer({ shift }: { shift: AttendanceShift }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const net = shiftNetWorkedSeconds(shift, now);
  const gross = shiftGrossSeconds(shift, now);
  const totalBreak = shift.total_break_seconds + openBreakElapsedSeconds(shift, now);

  const clockInManila = toManilaYmd(shift.clock_in_at);
  const todayManila = manilaTodayYmd();
  const isOvernight = clockInManila !== todayManila;

  return (
    <div className="space-y-3">
      {isOvernight && (
        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          Shift started {clockInManila}
        </div>
      )}
      <div className="text-center">
        <p className="text-3xl font-mono font-bold text-gray-900 tabular-nums">
          {formatDurationSeconds(net)}
        </p>
        <p className="text-xs text-gray-500 mt-1">Net worked time</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded-lg py-2 px-1">
          <p className="text-xs text-gray-500">Clock In</p>
          <p className="text-xs font-medium">{formatManilaTime(shift.clock_in_at)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg py-2 px-1">
          <p className="text-xs text-gray-500">Gross</p>
          <p className="text-xs font-medium">{formatDurationSeconds(gross)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg py-2 px-1">
          <p className="text-xs text-gray-500">Breaks</p>
          <p className="text-xs font-medium">{formatDurationSeconds(totalBreak)}</p>
        </div>
      </div>
    </div>
  );
}

function TodayShiftHistory({ userId }: { userId: string }) {
  const today = manilaTodayYmd();
  const { data } = useAttendanceShiftsManilaRange(today, today, userId, 1, 10);
  const completedShifts = (data?.data || []).filter((s) => s.status === 'clocked_out');

  if (completedShifts.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <History className="h-3.5 w-3.5 text-gray-400" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Today's Shifts
        </p>
      </div>
      <div className="space-y-1.5">
        {completedShifts.map((shift) => {
          const net = shiftNetWorkedSeconds(shift);
          return (
            <div
              key={shift.id}
              className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2"
            >
              <span className="text-gray-600">
                {formatManilaTime(shift.clock_in_at)} — {shift.clock_out_at ? formatManilaTime(shift.clock_out_at) : '—'}
              </span>
              <span className="font-medium text-gray-900">{formatDurationSeconds(net)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamStatusSection() {
  const { data: openShifts = [], isLoading } = useAttendanceOpenShiftsTeam(true);

  if (isLoading) {
    return <p className="text-xs text-gray-400 text-center py-2">Loading team...</p>;
  }

  if (openShifts.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center py-3">
        No team members currently clocked in
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {openShifts.map((shift) => {
        const cfg = statusConfig[shift.status] || statusConfig.active;
        const name = shift.user_profile?.full_name || shift.user_profile?.email || 'Unknown';
        const initials = name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return (
          <div key={shift.id} className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px] bg-blue-50 text-blue-700">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${cfg.dot}`}
                />
              </div>
              <span className="text-sm text-gray-700 truncate">{name}</span>
            </div>
            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>
              {cfg.label}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

export const AttendanceWidget: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const userId = user?.id;

  const { data: openShift, isLoading } = useAttendanceOpenShift(userId);
  const clockIn = useAttendanceClockIn(userId);
  const clockOut = useAttendanceClockOut(userId);
  const startBreak = useAttendanceStartBreak(userId);
  const endBreak = useAttendanceEndBreak(userId);

  const [showClockOutConfirm, setShowClockOutConfirm] = useState(false);

  const isManager = profile?.role === 'leads_manager' || profile?.role === 'sales_manager';
  const openBreak = findOpenBreak(openShift);
  const isMutating = clockIn.isPending || clockOut.isPending || startBreak.isPending || endBreak.isPending;

  const handleClockIn = () => clockIn.mutate();
  const handleClockOut = () => setShowClockOutConfirm(true);
  const confirmClockOut = () => {
    setShowClockOutConfirm(false);
    if (openShift) clockOut.mutate(openShift.id);
  };
  const handleStartBreak = () => {
    if (openShift) startBreak.mutate(openShift.id);
  };
  const handleEndBreak = () => {
    if (openBreak) endBreak.mutate(openBreak.id);
  };

  const shiftStatus = openShift?.status;
  const cfg = shiftStatus ? statusConfig[shiftStatus] : null;

  return (
    <>
      <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60 h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Attendance</CardTitle>
                <p className="text-sm text-gray-500">
                  {cfg ? (
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${cfg.dot} animate-pulse`} />
                      {cfg.label}
                    </span>
                  ) : (
                    'Not clocked in'
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : openShift && shiftStatus !== 'clocked_out' ? (
            <>
              <LiveTimer shift={openShift} />

              {/* Action Buttons */}
              <div className="flex gap-2">
                {shiftStatus === 'active' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                      onClick={handleStartBreak}
                      disabled={isMutating}
                    >
                      <Coffee className="h-4 w-4 mr-1.5" />
                      Break
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                      onClick={handleClockOut}
                      disabled={isMutating}
                    >
                      <LogOut className="h-4 w-4 mr-1.5" />
                      Clock Out
                    </Button>
                  </>
                )}
                {shiftStatus === 'on_break' && (
                  <>
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={handleEndBreak}
                      disabled={isMutating}
                    >
                      <Play className="h-4 w-4 mr-1.5" />
                      End Break
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                      onClick={handleClockOut}
                      disabled={isMutating}
                    >
                      <LogOut className="h-4 w-4 mr-1.5" />
                      Clock Out
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : (
            /* Not clocked in */
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-4">Ready to start your shift?</p>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all"
                onClick={handleClockIn}
                disabled={isMutating}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Clock In
              </Button>
            </div>
          )}

          {/* Today's completed shifts */}
          {userId && <TodayShiftHistory userId={userId} />}

          {/* Manager: Team Status */}
          {isManager && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-gray-500" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Team Status
                  </p>
                </div>
                <TeamStatusSection />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Clock Out Confirmation */}
      <AlertDialog open={showClockOutConfirm} onOpenChange={setShowClockOutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clock Out?</AlertDialogTitle>
            <AlertDialogDescription>
              {openShift && shiftStatus === 'on_break'
                ? 'You are currently on break. Clocking out will automatically end your break.'
                : 'Are you sure you want to end your current shift?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClockOut}
              className="bg-red-600 hover:bg-red-700"
            >
              Clock Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
