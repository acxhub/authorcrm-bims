import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { attendanceKeys } from './useAttendance';

export function useAttendanceRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_shifts' },
        () => {
          queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_breaks' },
        () => {
          queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
