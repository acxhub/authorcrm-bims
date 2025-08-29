import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Lead = Tables<'leads'> & {
  status: Tables<'statuses'>;
  assigned_to_profile?: Tables<'profiles'> | null;
  created_by_profile: Tables<'profiles'>;
  tags: Tables<'tags'>[];
};

export type CreateLeadData = TablesInsert<'leads'>;
export type UpdateLeadData = TablesUpdate<'leads'>;

export interface LeadsFilter {
  search?: string;
  status_ids?: string[];
  tag_ids?: string[];
  assigned_to?: string;
  assignment_status?: 'all' | 'assigned' | 'unassigned';
  created_by?: string;
  date_from?: string;
  date_to?: string;
  source?: string;
}

export interface PaginatedLeadsResponse {
  data: Lead[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

export class LeadsAPI {
  async getLeads(
    filters: LeadsFilter = {},
    page = 1,
    limit = 10
  ): Promise<PaginatedLeadsResponse> {
    let query = supabase
      .from('leads')
      .select(`
        *,
        status:statuses(*),
        assigned_to_profile:profiles!leads_assigned_to_fkey(*),
        created_by_profile:profiles!leads_created_by_fkey(*),
        tags:lead_tags(
          tag:tags(*)
        )
      `, { count: 'exact' });

    // Apply filters - Search across key fields
    if (filters.search) {
      // Limit search to the most important fields to avoid query complexity
      query = query.or(`book_title.ilike.%${filters.search}%,author_name.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,primary_email.ilike.%${filters.search}%,phone_number_1.ilike.%${filters.search}%`);
    }

    if (filters.status_ids?.length) {
      query = query.in('status_id', filters.status_ids);
    }

    // Filter by tag IDs - leads that have ANY of the specified tags
    if (filters.tag_ids?.length) {
      // Use a subquery to find leads that have any of the specified tags
      const { data: leadIdsWithTags } = await supabase
        .from('lead_tags')
        .select('lead_id')
        .in('tag_id', filters.tag_ids);
      
      if (leadIdsWithTags?.length) {
        const leadIds = leadIdsWithTags.map(lt => lt.lead_id);
        query = query.in('id', leadIds);
      } else {
        // No leads have these tags, return empty result
        return {
          data: [],
          count: 0,
          page,
          limit,
          total_pages: 0
        };
      }
    }

    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }

    // Filter by assignment status
    if (filters.assignment_status === 'assigned') {
      query = query.not('assigned_to', 'is', null);
    } else if (filters.assignment_status === 'unassigned') {
      query = query.is('assigned_to', null);
    }

    if (filters.created_by) {
      query = query.eq('created_by', filters.created_by);
    }

    if (filters.source) {
      query = query.eq('source', filters.source);
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
      throw new Error(`Failed to fetch leads: ${error.message}`);
    }

    // Transform the data to flatten tags
    const transformedData = (data || []).map(lead => ({
      ...lead,
      tags: lead.tags?.map((lt: any) => lt.tag).filter(Boolean) || []
    }));

    return {
      data: transformedData,
      count: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit)
    };
  }

  async getLeadById(id: string): Promise<Lead> {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        status:statuses(*),
        assigned_to_profile:profiles!leads_assigned_to_fkey(*),
        created_by_profile:profiles!leads_created_by_fkey(*),
        tags:lead_tags(
          tag:tags(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch lead: ${error.message}`);
    }

    // Transform tags
    const transformedData = {
      ...data,
      tags: data.tags?.map((lt: any) => lt.tag).filter(Boolean) || []
    };

    return transformedData;
  }

  async createLead(leadData: CreateLeadData): Promise<Lead> {
    const { data, error } = await supabase
      .from('leads')
      .insert(leadData)
      .select(`
        *,
        status:statuses(*),
        assigned_to_profile:profiles!leads_assigned_to_fkey(*),
        created_by_profile:profiles!leads_created_by_fkey(*),
        tags:lead_tags(
          tag:tags(*)
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create lead: ${error.message}`);
    }

    return {
      ...data,
      tags: data.tags?.map((lt: any) => lt.tag).filter(Boolean) || []
    };
  }

  async updateLead(id: string, updates: UpdateLeadData): Promise<Lead> {
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        status:statuses(*),
        assigned_to_profile:profiles!leads_assigned_to_fkey(*),
        created_by_profile:profiles!leads_created_by_fkey(*),
        tags:lead_tags(
          tag:tags(*)
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update lead: ${error.message}`);
    }

    return {
      ...data,
      tags: data.tags?.map((lt: any) => lt.tag).filter(Boolean) || []
    };
  }

  async deleteLead(id: string): Promise<void> {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete lead: ${error.message}`);
    }
  }

  async assignLead(leadId: string, assignedTo: string | null): Promise<Lead> {
    return this.updateLead(leadId, { assigned_to: assignedTo });
  }

  async updateLeadStatus(leadId: string, statusId: string): Promise<Lead> {
    return this.updateLead(leadId, { status_id: statusId });
  }

  async addTagsToLead(leadId: string, tagIds: string[]): Promise<void> {
    const leadTags = tagIds.map(tagId => ({
      lead_id: leadId,
      tag_id: tagId
    }));

    const { error } = await supabase
      .from('lead_tags')
      .insert(leadTags);

    if (error) {
      throw new Error(`Failed to add tags to lead: ${error.message}`);
    }
  }

  async removeTagsFromLead(leadId: string, tagIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('lead_tags')
      .delete()
      .eq('lead_id', leadId)
      .in('tag_id', tagIds);

    if (error) {
      throw new Error(`Failed to remove tags from lead: ${error.message}`);
    }
  }
}

export const leadsApi = new LeadsAPI(); 