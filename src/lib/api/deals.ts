import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Deal = Tables<'deals'> & {
  lead: Tables<'leads'> & {
    status: Tables<'statuses'>;
    assigned_to_profile?: Tables<'profiles'> | null;
    created_by_profile: Tables<'profiles'>;
  };
  status: Tables<'statuses'>;
  assigned_to_profile?: Tables<'profiles'> | null;
  created_by_profile: Tables<'profiles'>;
};

export type CreateDealData = TablesInsert<'deals'>;
export type UpdateDealData = TablesUpdate<'deals'>;

export interface DealsFilter {
  search?: string;
  status_ids?: string[];
  assigned_to?: string;
  created_by?: string;
  lead_id?: string;
  category?: string;
  date_from?: string;
  date_to?: string;
}

export interface PaginatedDealsResponse {
  data: Deal[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

export class DealsAPI {
  async getDeals(
    filters: DealsFilter = {},
    page = 1,
    limit = 10
  ): Promise<PaginatedDealsResponse> {
    let query = supabase
      .from('deals')
      .select(`
        *,
        lead:leads(
          *,
          status:statuses(*),
          assigned_to_profile:profiles!leads_assigned_to_fkey(*),
          created_by_profile:profiles!leads_created_by_fkey(*)
        ),
        status:statuses(*),
        assigned_to_profile:profiles!deals_assigned_to_fkey(*),
        created_by_profile:profiles!deals_created_by_fkey(*)
      `, { count: 'exact' });

    // Filter out archived deals
    query = query.is('deleted_at', null);

    // Apply filters
    if (filters.search) {
      query = query.or(`offer_title.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
    }

    if (filters.status_ids?.length) {
      query = query.in('status_id', filters.status_ids);
    }

    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }

    if (filters.created_by) {
      query = query.eq('created_by', filters.created_by);
    }

    if (filters.lead_id) {
      query = query.eq('lead_id', filters.lead_id);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Order by created_at desc
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch deals: ${error.message}`);
    }

    return {
      data: data || [],
      count: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit)
    };
  }

  async getDealById(id: string): Promise<Deal> {
    const { data, error } = await supabase
      .from('deals')
      .select(`
        *,
        lead:leads(
          *,
          status:statuses(*),
          assigned_to_profile:profiles!leads_assigned_to_fkey(*),
          created_by_profile:profiles!leads_created_by_fkey(*)
        ),
        status:statuses(*),
        assigned_to_profile:profiles!deals_assigned_to_fkey(*),
        created_by_profile:profiles!deals_created_by_fkey(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch deal: ${error.message}`);
    }

    return data;
  }

  async createDeal(dealData: CreateDealData): Promise<Deal> {
    const { data, error } = await supabase
      .from('deals')
      .insert(dealData)
      .select(`
        *,
        lead:leads(
          *,
          status:statuses(*),
          assigned_to_profile:profiles!leads_assigned_to_fkey(*),
          created_by_profile:profiles!leads_created_by_fkey(*)
        ),
        status:statuses(*),
        assigned_to_profile:profiles!deals_assigned_to_fkey(*),
        created_by_profile:profiles!deals_created_by_fkey(*)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create deal: ${error.message}`);
    }

    return data;
  }

  async updateDeal(id: string, updates: UpdateDealData): Promise<Deal> {
    const { data, error } = await supabase
      .from('deals')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        lead:leads(
          *,
          status:statuses(*),
          assigned_to_profile:profiles!leads_assigned_to_fkey(*),
          created_by_profile:profiles!leads_created_by_fkey(*)
        ),
        status:statuses(*),
        assigned_to_profile:profiles!deals_assigned_to_fkey(*),
        created_by_profile:profiles!deals_created_by_fkey(*)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update deal: ${error.message}`);
    }

    return data;
  }

  async archiveDeal(id: string, deletedBy: string): Promise<void> {
    const { error } = await supabase
      .from('deals')
      .update({ deleted_at: new Date().toISOString(), deleted_by: deletedBy })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to archive deal: ${error.message}`);
    }
  }

  async restoreDeal(id: string): Promise<void> {
    const { error } = await supabase
      .from('deals')
      .update({ deleted_at: null, deleted_by: null })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to restore deal: ${error.message}`);
    }
  }

  async permanentlyDeleteDeal(id: string): Promise<void> {
    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to permanently delete deal: ${error.message}`);
    }
  }

  async getArchivedDeals(page = 1, limit = 10): Promise<PaginatedDealsResponse> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('deals')
      .select(`
        *,
        lead:leads(
          *,
          status:statuses(*),
          assigned_to_profile:profiles!leads_assigned_to_fkey(*),
          created_by_profile:profiles!leads_created_by_fkey(*)
        ),
        status:statuses(*),
        assigned_to_profile:profiles!deals_assigned_to_fkey(*),
        created_by_profile:profiles!deals_created_by_fkey(*)
      `, { count: 'exact' })
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch archived deals: ${error.message}`);
    }

    return {
      data: data || [],
      count: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit)
    };
  }

  async assignDeal(dealId: string, assignedTo: string | null): Promise<Deal> {
    return this.updateDeal(dealId, { assigned_to: assignedTo });
  }

  async updateDealStatus(dealId: string, statusId: string): Promise<Deal> {
    return this.updateDeal(dealId, { status_id: statusId });
  }

  async getDealsByLeadId(leadId: string): Promise<Deal[]> {
    const { data, error } = await supabase
      .from('deals')
      .select(`
        *,
        lead:leads(
          *,
          status:statuses(*),
          assigned_to_profile:profiles!leads_assigned_to_fkey(*),
          created_by_profile:profiles!leads_created_by_fkey(*)
        ),
        status:statuses(*),
        assigned_to_profile:profiles!deals_assigned_to_fkey(*),
        created_by_profile:profiles!deals_created_by_fkey(*)
      `)
      .eq('lead_id', leadId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch deals for lead: ${error.message}`);
    }

    return data || [];
  }
}

export const dealsApi = new DealsAPI(); 