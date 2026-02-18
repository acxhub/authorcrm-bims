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
  include_archived?: boolean;
  no_tags?: boolean;
  no_activities?: boolean;
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
    // For no_tags or no_activities filters, we need client-side filtering
    // to avoid URL length limits with large .not.in() queries
    if (filters.no_tags || filters.no_activities) {
      return this.getLeadsWithClientSideFiltering(filters, page, limit);
    }

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

    // Filter out archived leads unless explicitly requested
    if (!filters.include_archived) {
      query = query.is('deleted_at', null);
    }

    // Apply filters - Search across key fields
    if (filters.search) {
      // Limit search to the most important fields to avoid query complexity
      query = query.or(`book_title.ilike.%${filters.search}%,author_name.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,primary_email.ilike.%${filters.search}%,phone_number_1.ilike.%${filters.search}%,publisher.ilike.%${filters.search}%`);
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

    // Order: pinned first, then by assigned_at desc (newly distributed first), then created_at desc.
    query = query
      .order('is_pinned', { ascending: false })
      .order('pinned_at', { ascending: false, nullsFirst: false })
      .order('assigned_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch leads: ${error.message}`);
    }

    // Transform the data to flatten tags
    const transformedData = (data || []).map(lead => ({
      ...lead,
      tags: lead.tags?.map((lt: { tag?: Tables<'tags'> }) => lt.tag).filter(Boolean) || []
    }));

    return {
      data: transformedData,
      count: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit)
    };
  }

  /**
   * Client-side filtering for no_tags and no_activities filters.
   * This avoids URL length limits when using .not.in() with large ID lists.
   */
  private async getLeadsWithClientSideFiltering(
    filters: LeadsFilter,
    page: number,
    limit: number
  ): Promise<PaginatedLeadsResponse> {
    // Step 1: Fetch all lead IDs (just IDs to minimize data transfer)
    let leadIdsQuery = supabase
      .from('leads')
      .select('id');

    if (!filters.include_archived) {
      leadIdsQuery = leadIdsQuery.is('deleted_at', null);
    }

    // Apply basic filters that can be done server-side
    if (filters.status_ids?.length) {
      leadIdsQuery = leadIdsQuery.in('status_id', filters.status_ids);
    }
    if (filters.assigned_to) {
      leadIdsQuery = leadIdsQuery.eq('assigned_to', filters.assigned_to);
    }
    if (filters.assignment_status === 'assigned') {
      leadIdsQuery = leadIdsQuery.not('assigned_to', 'is', null);
    } else if (filters.assignment_status === 'unassigned') {
      leadIdsQuery = leadIdsQuery.is('assigned_to', null);
    }
    if (filters.created_by) {
      leadIdsQuery = leadIdsQuery.eq('created_by', filters.created_by);
    }
    if (filters.date_from) {
      leadIdsQuery = leadIdsQuery.gte('created_at', filters.date_from);
    }
    if (filters.date_to) {
      leadIdsQuery = leadIdsQuery.lte('created_at', filters.date_to);
    }

    const { data: allLeadIds, error: leadIdsError } = await leadIdsQuery;
    if (leadIdsError) {
      throw new Error(`Failed to fetch lead IDs: ${leadIdsError.message}`);
    }

    let candidateLeadIds = new Set((allLeadIds || []).map(l => l.id));

    // Step 2: Apply no_tags filter client-side
    if (filters.no_tags && candidateLeadIds.size > 0) {
      const { data: leadTagsData } = await supabase
        .from('lead_tags')
        .select('lead_id');

      const leadsWithTags = new Set((leadTagsData || []).map(lt => lt.lead_id));
      
      // Keep only leads that have NO tags
      candidateLeadIds = new Set(
        [...candidateLeadIds].filter(id => !leadsWithTags.has(id))
      );
    }

    // Step 3: Apply no_activities filter client-side
    if (filters.no_activities && candidateLeadIds.size > 0) {
      const { data: activitiesData } = await supabase
        .from('activity_logs')
        .select('lead_id')
        .is('deleted_at', null);

      const leadsWithActivities = new Set((activitiesData || []).map(a => a.lead_id));
      
      // Keep only leads that have NO activities
      candidateLeadIds = new Set(
        [...candidateLeadIds].filter(id => !leadsWithActivities.has(id))
      );
    }

    // Step 4: If no matching leads, return empty
    if (candidateLeadIds.size === 0) {
      return {
        data: [],
        count: 0,
        page,
        limit,
        total_pages: 0
      };
    }

    // Step 5: Fetch full lead data for the paginated subset
    // First, get the sorted order by fetching minimal data
    const candidateIdsArray = [...candidateLeadIds];
    
    // Fetch leads with ordering to determine correct pagination
    let orderedQuery = supabase
      .from('leads')
      .select('id, is_pinned, pinned_at, assigned_at, created_at')
      .in('id', candidateIdsArray)
      .order('is_pinned', { ascending: false })
      .order('pinned_at', { ascending: false, nullsFirst: false })
      .order('assigned_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    const { data: orderedLeads, error: orderedError } = await orderedQuery;
    if (orderedError) {
      throw new Error(`Failed to fetch ordered leads: ${orderedError.message}`);
    }

    const totalCount = orderedLeads?.length || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Get the IDs for the current page
    const from = (page - 1) * limit;
    const pageIds = (orderedLeads || []).slice(from, from + limit).map(l => l.id);

    if (pageIds.length === 0) {
      return {
        data: [],
        count: totalCount,
        page,
        limit,
        total_pages: totalPages
      };
    }

    // Fetch full data for the page
    const { data: fullLeads, error: fullError } = await supabase
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
      .in('id', pageIds);

    if (fullError) {
      throw new Error(`Failed to fetch full lead data: ${fullError.message}`);
    }

    // Sort the results to match the ordered IDs
    const idToLead = new Map((fullLeads || []).map(l => [l.id, l]));
    const sortedLeads = pageIds.map(id => idToLead.get(id)).filter(Boolean);

    // Apply search filter client-side if present
    let filteredLeads = sortedLeads;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredLeads = sortedLeads.filter(lead => {
        return (
          lead.book_title?.toLowerCase().includes(searchLower) ||
          lead.author_name?.toLowerCase().includes(searchLower) ||
          lead.first_name?.toLowerCase().includes(searchLower) ||
          lead.last_name?.toLowerCase().includes(searchLower) ||
          lead.primary_email?.toLowerCase().includes(searchLower) ||
          lead.phone_number_1?.toLowerCase().includes(searchLower) ||
          lead.publisher?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Transform the data to flatten tags
    const transformedData = filteredLeads.map(lead => ({
      ...lead,
      tags: lead.tags?.map((lt: { tag?: Tables<'tags'> }) => lt.tag).filter(Boolean) || []
    }));

    return {
      data: transformedData,
      count: totalCount,
      page,
      limit,
      total_pages: totalPages
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
      tags: data.tags?.map((lt: { tag?: Tables<'tags'> }) => lt.tag).filter(Boolean) || []
    };

    return transformedData;
  }

  async createLead(leadData: CreateLeadData): Promise<Lead> {
    const insertData = {
      ...leadData,
      ...(leadData.assigned_to && { assigned_at: new Date().toISOString() }),
    };
    const { data, error } = await supabase
      .from('leads')
      .insert(insertData)
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
      tags: data.tags?.map((lt: { tag?: Tables<'tags'> }) => lt.tag).filter(Boolean) || []
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
      tags: data.tags?.map((lt: { tag?: Tables<'tags'> }) => lt.tag).filter(Boolean) || []
    };
  }

  async archiveLead(id: string, deletedBy: string): Promise<void> {
    const { error } = await supabase.rpc('archive_lead_cascade', {
      p_lead_id: id,
      p_deleted_by: deletedBy,
    });

    if (error) {
      throw new Error(`Failed to archive lead: ${error.message}`);
    }
  }

  async restoreLead(id: string): Promise<void> {
    const { error } = await supabase.rpc('restore_lead_cascade', {
      p_lead_id: id,
    });

    if (error) {
      throw new Error(`Failed to restore lead: ${error.message}`);
    }
  }

  async permanentlyDeleteLead(id: string): Promise<void> {
    // Delete related records first (lead_tags, activities, comments, deals)
    await supabase.from('lead_tags').delete().eq('lead_id', id);
    await supabase.from('activity_logs').delete().eq('lead_id', id);
    await supabase.from('comments').delete().eq('lead_id', id);
    await supabase.from('deals').delete().eq('lead_id', id);

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to permanently delete lead: ${error.message}`);
    }
  }

  async getArchivedLeads(page = 1, limit = 10): Promise<PaginatedLeadsResponse> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('leads')
      .select(`
        *,
        status:statuses(*),
        assigned_to_profile:profiles!leads_assigned_to_fkey(*),
        created_by_profile:profiles!leads_created_by_fkey(*),
        tags:lead_tags(
          tag:tags(*)
        )
      `, { count: 'exact' })
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch archived leads: ${error.message}`);
    }

    const transformedData = (data || []).map(lead => ({
      ...lead,
      tags: lead.tags?.map((lt: { tag?: Tables<'tags'> }) => lt.tag).filter(Boolean) || []
    }));

    return {
      data: transformedData,
      count: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit)
    };
  }

  async assignLead(leadId: string, assignedTo: string | null): Promise<Lead> {
    return this.updateLead(leadId, {
      assigned_to: assignedTo,
      assigned_at: assignedTo ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    });
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

  async pinLead(leadId: string): Promise<Lead> {
    return this.updateLead(leadId, {
      is_pinned: true,
      pinned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  async unpinLead(leadId: string): Promise<Lead> {
    return this.updateLead(leadId, {
      is_pinned: false,
      pinned_at: null,
      updated_at: new Date().toISOString(),
    });
  }

  async getPinnedLeadsCount(): Promise<number> {
    const { count, error } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('is_pinned', true)
      .is('deleted_at', null);

    if (error) {
      throw new Error(`Failed to count pinned leads: ${error.message}`);
    }

    return count || 0;
  }
}

export const leadsApi = new LeadsAPI(); 