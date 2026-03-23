import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { manilaDateRangeToUtcIsoRange } from '@/lib/timezone';

export type AttendanceShift = Tables<'attendance_shifts'> & {
  user_profile?: Pick<Tables<'profiles'>, 'id' | 'full_name' | 'email'> | null;
  breaks?: Tables<'attendance_breaks'>[];
};

const SHIFT_SELECT = `
  *,
  user_profile:profiles!attendance_shifts_user_id_fkey(id, full_name, email),
  breaks:attendance_breaks(*)
`;

function mapRpcError(message: string, fallback: string): Error {
  if (message.includes('Already clocked in')) return new Error('You are already clocked in.');
  if (message.includes('Already clocked out')) return new Error('Already clocked out.');
  if (message.includes('Account is inactive')) return new Error('Your account is inactive.');
  if (message.includes('Not authenticated')) return new Error('Not signed in.');
  if (message.includes('Not your shift')) return new Error('This is not your active shift.');
  if (message.includes('Not your break')) return new Error('This is not your break.');
  if (message.includes('Shift already ended')) return new Error('This shift has already ended.');
  if (message.includes('Cannot start break')) return new Error('You cannot start a break right now.');
  if (message.includes('Break already open')) return new Error('You already have an open break.');
  if (message.includes('Break already ended')) return new Error('This break has already ended.');
  if (message.includes('Shift not found')) return new Error('Shift not found.');
  if (message.includes('Break not found')) return new Error('Break not found.');
  return new Error(`${fallback}: ${message}`);
}

export class AttendanceAPI {
  async getOpenShiftForUser(userId: string): Promise<AttendanceShift | null> {
    const { data, error } = await supabase
      .from('attendance_shifts')
      .select(SHIFT_SELECT)
      .eq('user_id', userId)
      .is('clock_out_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load current shift: ${error.message}`);
    }
    return data as AttendanceShift | null;
  }

  async getShiftById(id: string): Promise<AttendanceShift> {
    const { data, error } = await supabase
      .from('attendance_shifts')
      .select(SHIFT_SELECT)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to load shift: ${error.message}`);
    }
    return data as AttendanceShift;
  }

  /**
   * Shifts whose clock-in falls within Manila calendar days [fromYmd, toYmd] (inclusive).
   */
  async getShiftsByClockInManilaRange(
    fromYmd: string,
    toYmd: string,
    opts: { userId?: string; page?: number; limit?: number } = {}
  ): Promise<{ data: AttendanceShift[]; count: number }> {
    const { startIso, endIso } = manilaDateRangeToUtcIsoRange(fromYmd, toYmd);
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 100;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('attendance_shifts')
      .select(SHIFT_SELECT, { count: 'exact' })
      .gte('clock_in_at', startIso)
      .lte('clock_in_at', endIso)
      .order('clock_in_at', { ascending: false })
      .range(from, to);

    if (opts.userId) {
      query = query.eq('user_id', opts.userId);
    }

    const { data, error, count } = await query;
    if (error) {
      throw new Error(`Failed to load attendance: ${error.message}`);
    }
    return { data: (data || []) as AttendanceShift[], count: count ?? 0 };
  }

  /** Open shifts (any user) — managers only via RLS. */
  async getOpenShifts(): Promise<AttendanceShift[]> {
    const { data, error } = await supabase
      .from('attendance_shifts')
      .select(SHIFT_SELECT)
      .is('clock_out_at', null)
      .order('clock_in_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load open shifts: ${error.message}`);
    }
    return (data || []) as AttendanceShift[];
  }

  async clockIn(): Promise<string> {
    const { data, error } = await supabase.rpc('attendance_clock_in', {
      p_at: new Date().toISOString(),
    });
    if (error) {
      throw mapRpcError(error.message, 'Clock in failed');
    }
    return data as string;
  }

  async clockOut(shiftId: string): Promise<void> {
    const { error } = await supabase.rpc('attendance_clock_out', {
      p_shift_id: shiftId,
      p_at: new Date().toISOString(),
    });
    if (error) {
      throw mapRpcError(error.message, 'Clock out failed');
    }
  }

  async startBreak(shiftId: string): Promise<string> {
    const { data, error } = await supabase.rpc('attendance_start_break', {
      p_shift_id: shiftId,
      p_at: new Date().toISOString(),
    });
    if (error) {
      throw mapRpcError(error.message, 'Start break failed');
    }
    return data as string;
  }

  async endBreak(breakId: string): Promise<void> {
    const { error } = await supabase.rpc('attendance_end_break', {
      p_break_id: breakId,
      p_at: new Date().toISOString(),
    });
    if (error) {
      throw mapRpcError(error.message, 'End break failed');
    }
  }
}

export const attendanceApi = new AttendanceAPI();
