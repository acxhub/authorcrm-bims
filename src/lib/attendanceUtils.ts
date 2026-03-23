import type { AttendanceShift } from '@/lib/api/attendance';

export function findOpenBreak(shift: AttendanceShift | null | undefined) {
  return shift?.breaks?.find((b) => !b.break_end_at) ?? null;
}

/** Elapsed break time for an open break (seconds). */
export function openBreakElapsedSeconds(shift: AttendanceShift | null | undefined, nowMs: number = Date.now()): number {
  const b = findOpenBreak(shift);
  if (!b) return 0;
  return Math.max(0, Math.floor((nowMs - new Date(b.break_start_at).getTime()) / 1000));
}

/** Gross shift length in seconds (wall clock). */
export function shiftGrossSeconds(shift: AttendanceShift, nowMs: number = Date.now()): number {
  const start = new Date(shift.clock_in_at).getTime();
  const end = shift.clock_out_at ? new Date(shift.clock_out_at).getTime() : nowMs;
  return Math.max(0, Math.floor((end - start) / 1000));
}

/** Net worked seconds: gross minus completed breaks in DB minus current open break elapsed. */
export function shiftNetWorkedSeconds(shift: AttendanceShift, nowMs: number = Date.now()): number {
  const openExtra = openBreakElapsedSeconds(shift, nowMs);
  return Math.max(0, shiftGrossSeconds(shift, nowMs) - shift.total_break_seconds - openExtra);
}

/** Zero-padded stopwatch style: `00:00:00` (hours unbounded, min/sec always 2 digits). */
export function formatDurationSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad2 = (n: number) => n.toString().padStart(2, '0');
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
}
