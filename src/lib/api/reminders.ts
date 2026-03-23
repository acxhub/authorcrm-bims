import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Reminder = Tables<'reminders'> & {
  lead?: Pick<Tables<'leads'>, 'id' | 'first_name' | 'last_name' | 'author_name' | 'pen_name' | 'book_title'> | null;
};

export type CreateReminderData = TablesInsert<'reminders'>;
export type UpdateReminderData = TablesUpdate<'reminders'>;

export interface RemindersFilter {
  user_id?: string;
  lead_id?: string;
  is_completed?: boolean;
  priority?: string;
  due_before?: string;
  due_after?: string;
}

export interface PaginatedRemindersResponse {
  data: Reminder[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

const REMINDER_SELECT = `
  *,
  lead:leads(id, first_name, last_name, author_name, pen_name, book_title)
`;

export class RemindersAPI {
  async getReminders(
    filters: RemindersFilter = {},
    page = 1,
    limit = 50
  ): Promise<PaginatedRemindersResponse> {
    let query = supabase
      .from('reminders')
      .select(REMINDER_SELECT, { count: 'exact' });

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters.lead_id) {
      query = query.eq('lead_id', filters.lead_id);
    }

    if (filters.is_completed !== undefined) {
      query = query.eq('is_completed', filters.is_completed);
    }

    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }

    if (filters.due_before) {
      query = query.lte('due_date', filters.due_before);
    }

    if (filters.due_after) {
      query = query.gte('due_date', filters.due_after);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
    query = query
      .order('is_completed', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch reminders: ${error.message}`);
    }

    return {
      data: data || [],
      count: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    };
  }

  async getReminderById(id: string): Promise<Reminder> {
    const { data, error } = await supabase
      .from('reminders')
      .select(REMINDER_SELECT)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch reminder: ${error.message}`);
    }

    return data;
  }

  async getRemindersByLeadId(leadId: string): Promise<Reminder[]> {
    const { data, error } = await supabase
      .from('reminders')
      .select(REMINDER_SELECT)
      .eq('lead_id', leadId)
      .order('is_completed', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch reminders for lead: ${error.message}`);
    }

    return data || [];
  }

  async createReminder(data: CreateReminderData): Promise<Reminder> {
    const { data: reminder, error } = await supabase
      .from('reminders')
      .insert(data)
      .select(REMINDER_SELECT)
      .single();

    if (error) {
      throw new Error(`Failed to create reminder: ${error.message}`);
    }

    return reminder;
  }

  async updateReminder(id: string, updates: UpdateReminderData): Promise<Reminder> {
    const { data, error } = await supabase
      .from('reminders')
      .update(updates)
      .eq('id', id)
      .select(REMINDER_SELECT)
      .single();

    if (error) {
      throw new Error(`Failed to update reminder: ${error.message}`);
    }

    return data;
  }

  async toggleComplete(id: string, isCompleted: boolean): Promise<Reminder> {
    const { data, error } = await supabase
      .from('reminders')
      .update({
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select(REMINDER_SELECT)
      .single();

    if (error) {
      throw new Error(`Failed to toggle reminder: ${error.message}`);
    }

    return data;
  }

  async deleteReminder(id: string): Promise<void> {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete reminder: ${error.message}`);
    }
  }

  async getUpcomingReminders(userId: string, days = 7): Promise<Reminder[]> {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('reminders')
      .select(REMINDER_SELECT)
      .eq('user_id', userId)
      .eq('is_completed', false)
      .or(`due_date.is.null,due_date.lte.${futureDateStr}`)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(`Failed to fetch upcoming reminders: ${error.message}`);
    }

    return data || [];
  }

  async getOverdueReminders(userId: string): Promise<Reminder[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('reminders')
      .select(REMINDER_SELECT)
      .eq('user_id', userId)
      .eq('is_completed', false)
      .lt('due_date', today)
      .order('due_date', { ascending: true })
      .limit(20);

    if (error) {
      throw new Error(`Failed to fetch overdue reminders: ${error.message}`);
    }

    return data || [];
  }
}

export const remindersApi = new RemindersAPI();
