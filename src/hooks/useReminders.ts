import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { remindersApi } from '@/lib/api/reminders';
import type { CreateReminderData, UpdateReminderData, RemindersFilter } from '@/lib/api/reminders';
import { toast } from '@/hooks/use-toast';

export const useReminders = (filters: RemindersFilter = {}, page = 1, limit = 50) => {
  return useQuery({
    queryKey: ['reminders', filters, page, limit],
    queryFn: () => remindersApi.getReminders(filters, page, limit),
    staleTime: 2 * 60 * 1000,
  });
};

export const useRemindersByLeadId = (leadId: string) => {
  return useQuery({
    queryKey: ['reminders', 'by-lead', leadId],
    queryFn: () => remindersApi.getRemindersByLeadId(leadId),
    enabled: !!leadId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useUpcomingReminders = (userId: string, days = 7) => {
  return useQuery({
    queryKey: ['reminders', 'upcoming', userId, days],
    queryFn: () => remindersApi.getUpcomingReminders(userId, days),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useOverdueReminders = (userId: string) => {
  return useQuery({
    queryKey: ['reminders', 'overdue', userId],
    queryFn: () => remindersApi.getOverdueReminders(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReminderData) => remindersApi.createReminder(data),
    onSuccess: (newReminder) => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast({
        title: 'Reminder created',
        description: `"${newReminder.title}" has been added.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating reminder',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReminderData }) =>
      remindersApi.updateReminder(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['reminder', updated.id] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating reminder',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useToggleReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      remindersApi.toggleComplete(id, isCompleted),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['reminder', updated.id] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating reminder',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => remindersApi.deleteReminder(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.removeQueries({ queryKey: ['reminder', deletedId] });
      toast({
        title: 'Reminder deleted',
        description: 'Reminder has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting reminder',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
