import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '@/lib/api/attendance';
import { toast } from '@/hooks/use-toast';

export const attendanceKeys = {
  all: ['attendance'] as const,
  openShift: (userId: string) => ['attendance', 'open-shift', userId] as const,
  shiftsRange: (fromYmd: string, toYmd: string, userId: string | undefined, page: number, limit: number) =>
    ['attendance', 'shifts-range', fromYmd, toYmd, userId ?? 'all', page, limit] as const,
  openShiftsTeam: () => ['attendance', 'open-shifts-team'] as const,
};

export function useAttendanceOpenShift(userId: string | undefined) {
  return useQuery({
    queryKey: attendanceKeys.openShift(userId || ''),
    queryFn: () => attendanceApi.getOpenShiftForUser(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useAttendanceShiftsManilaRange(
  fromYmd: string,
  toYmd: string,
  userId: string | undefined,
  page = 1,
  limit = 100
) {
  return useQuery({
    queryKey: attendanceKeys.shiftsRange(fromYmd, toYmd, userId, page, limit),
    queryFn: () => attendanceApi.getShiftsByClockInManilaRange(fromYmd, toYmd, { userId, page, limit }),
    enabled: !!fromYmd && !!toYmd,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAttendanceOpenShiftsTeam(enabled: boolean) {
  return useQuery({
    queryKey: attendanceKeys.openShiftsTeam(),
    queryFn: () => attendanceApi.getOpenShifts(),
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

function invalidateAttendance(queryClient: ReturnType<typeof useQueryClient>, userId?: string) {
  queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
  if (userId) {
    queryClient.invalidateQueries({ queryKey: attendanceKeys.openShift(userId) });
  }
}

export function useAttendanceClockIn(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => attendanceApi.clockIn(),
    onSuccess: () => {
      invalidateAttendance(queryClient, userId);
      toast({ title: 'Clocked in', description: 'Have a productive shift.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Clock in failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAttendanceClockOut(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shiftId: string) => attendanceApi.clockOut(shiftId),
    onSuccess: () => {
      invalidateAttendance(queryClient, userId);
      toast({ title: 'Clocked out', description: 'Shift ended.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Clock out failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAttendanceStartBreak(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shiftId: string) => attendanceApi.startBreak(shiftId),
    onSuccess: () => {
      invalidateAttendance(queryClient, userId);
      toast({ title: 'On break', description: 'Break started.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Break failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAttendanceEndBreak(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (breakId: string) => attendanceApi.endBreak(breakId),
    onSuccess: () => {
      invalidateAttendance(queryClient, userId);
      toast({ title: 'Break ended', description: 'Welcome back.' });
    },
    onError: (error: Error) => {
      toast({ title: 'End break failed', description: error.message, variant: 'destructive' });
    },
  });
}
