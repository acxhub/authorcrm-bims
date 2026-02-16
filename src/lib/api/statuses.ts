import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Status = Tables<'statuses'>;
export type CreateStatusRequest = Omit<TablesInsert<'statuses'>, 'id' | 'created_at' | 'updated_at'>;
export type UpdateStatusRequest = Partial<Omit<TablesUpdate<'statuses'>, 'id' | 'created_at' | 'updated_at'>>;

export class StatusesAPI {
  async getStatuses(): Promise<Status[]> {
    const { data, error } = await supabase
      .from('statuses')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('order_index', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch statuses: ${error.message}`);
    }

    return data || [];
  }

  async getStatusById(id: string): Promise<Status> {
    const { data, error } = await supabase
      .from('statuses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch status: ${error.message}`);
    }

    return data;
  }

  async createStatus(statusData: CreateStatusRequest): Promise<Status> {
    const { data, error } = await supabase
      .from('statuses')
      .insert(statusData)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create status: ${error.message}`);
    }

    return data;
  }

  async updateStatus(id: string, updates: UpdateStatusRequest): Promise<Status> {
    const { data, error } = await supabase
      .from('statuses')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update status: ${error.message}`);
    }

    return data;
  }

  async archiveStatus(id: string, deletedBy: string): Promise<void> {
    // First check if any leads are using this status
    const { data: leadsUsingStatus, error: checkError } = await supabase
      .from('leads')
      .select('id')
      .eq('status_id', id)
      .is('deleted_at', null)
      .limit(1);

    if (checkError) {
      throw new Error(`Failed to check status usage: ${checkError.message}`);
    }

    if (leadsUsingStatus && leadsUsingStatus.length > 0) {
      throw new Error('Cannot archive status that is currently assigned to leads. Please reassign leads first.');
    }

    const { error } = await supabase
      .from('statuses')
      .update({ deleted_at: new Date().toISOString(), deleted_by: deletedBy })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to archive status: ${error.message}`);
    }
  }

  async restoreStatus(id: string): Promise<void> {
    const { error } = await supabase
      .from('statuses')
      .update({ deleted_at: null, deleted_by: null })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to restore status: ${error.message}`);
    }
  }

  async permanentlyDeleteStatus(id: string): Promise<void> {
    const { error } = await supabase
      .from('statuses')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to permanently delete status: ${error.message}`);
    }
  }

  async getArchivedStatuses(): Promise<Status[]> {
    const { data, error } = await supabase
      .from('statuses')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch archived statuses: ${error.message}`);
    }

    return data || [];
  }

  async reorderStatuses(statusUpdates: { id: string; order_index: number }[]): Promise<Status[]> {
    // Update all statuses in a transaction-like manner
    const updatePromises = statusUpdates.map(({ id, order_index }) =>
      this.updateStatus(id, { order_index })
    );

    try {
      await Promise.all(updatePromises);
      return this.getStatuses(); // Return updated list
    } catch (error) {
      throw new Error(`Failed to reorder statuses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createDefaultStatuses(): Promise<Status[]> {
    const defaultStatuses: CreateStatusRequest[] = [
      { name: 'New Lead', color: '#10B981', order_index: 1, is_active: true },
      { name: 'Contacted', color: '#3B82F6', order_index: 2, is_active: true },
      { name: 'Qualified', color: '#8B5CF6', order_index: 3, is_active: true },
      { name: 'Proposal Sent', color: '#F59E0B', order_index: 4, is_active: true },
      { name: 'Negotiating', color: '#EF4444', order_index: 5, is_active: true },
      { name: 'Closed Won', color: '#059669', order_index: 6, is_active: true },
      { name: 'Closed Lost', color: '#6B7280', order_index: 7, is_active: true },
      { name: 'Dead Lead', color: '#374151', order_index: 8, is_active: true },
    ];

    // Check if statuses already exist
    const existingStatuses = await this.getStatuses();
    if (existingStatuses.length > 0) {
      throw new Error('Default statuses already exist. Please delete existing statuses first.');
    }

    const { data, error } = await supabase
      .from('statuses')
      .insert(defaultStatuses)
      .select('*');

    if (error) {
      throw new Error(`Failed to create default statuses: ${error.message}`);
    }

    return data || [];
  }
}

export const statusesApi = new StatusesAPI(); 