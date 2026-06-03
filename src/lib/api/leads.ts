import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate, Json } from '@/integrations/supabase/types';

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
  in_pipeline?: boolean;
}

export interface PaginatedLeadsResponse {
  data: Lead[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

/** Server-side aggregated lead metrics (computed in Postgres over ALL matching rows). */
export interface LeadStats {
  total_leads: number;
  active_leads: number;
  closed_won: number;
  avg_time_to_close: number;
  new_leads_this_week: number;
  closed_won_this_month: number;
  closed_lost_this_month: number;
  leads_this_month: number;
  leads_last_month: number;
  status_counts: Array<{ status_id: string; count: number }>;
}

export type DuplicateTier = 'HIGH' | 'MEDIUM' | 'LOW';

/** A single existing lead that matches an incoming lead on >=2 identity points. */
export interface DuplicateMatch {
  id: string;
  author_name: string | null;
  book_title: string | null;
  phone_number_1: string | null;
  primary_email: string | null;
  assigned_to: string | null;
  points_matched: number;
  matched_on: string[];
  tier: DuplicateTier;
}

/** A duplicate hit for one staged import row (matched against the existing DB). */
export interface BatchDuplicateMatch {
  row_no: number;
  existing_lead_id: string;
  existing_label: string;
  points_matched: number;
  matched_on: string[];
  tier: DuplicateTier;
}

export interface DuplicateCheckInput {
  name?: string | null;
  book?: string | null;
  phones?: (string | null | undefined)[];
  emails?: (string | null | undefined)[];
  excludeId?: string | null;
}

export interface BatchDuplicateRow {
  row_no: number;
  name?: string | null;
  book?: string | null;
  phones?: (string | null | undefined)[];
  emails?: (string | null | undefined)[];
}

export class LeadsAPI {
  /**
   * Unified lead fetching via server-side RPC.
   * All filtering (search, status, tags, no_tags, untouched, assignment, dates)
   * is done in a single PostgreSQL function call (POST request, no URL length limits).
   * Only the page's worth of full lead data is fetched (max `limit` rows).
   */
  async getLeads(
    filters: LeadsFilter = {},
    page = 1,
    limit = 50
  ): Promise<PaginatedLeadsResponse> {
    // Step 1: Call RPC to get filtered, sorted, paginated lead IDs + total count
    const { data: rpcResult, error: rpcError } = await supabase.rpc('get_filtered_lead_ids', {
      p_no_tags: filters.no_tags || false,
      p_untouched: filters.no_activities || false,
      p_search: filters.search || null,
      p_status_ids: filters.status_ids?.length ? filters.status_ids : null,
      p_assigned_to: filters.assigned_to || null,
      p_assignment_status: filters.assignment_status || 'all',
      p_created_by: filters.created_by || null,
      p_date_from: filters.date_from || null,
      p_date_to: filters.date_to || null,
      p_tag_ids: filters.tag_ids?.length ? filters.tag_ids : null,
      p_include_archived: filters.include_archived || false,
      p_page: page,
      p_limit: limit,
      p_in_pipeline: filters.in_pipeline || false,
    });

    if (rpcError) {
      throw new Error(`Failed to fetch filtered leads: ${rpcError.message}`);
    }

    const { ids, total, total_pages } = rpcResult as {
      ids: string[];
      total: number;
      total_pages: number;
    };

    // Step 2: If no matching leads, return empty
    if (!ids || ids.length === 0) {
      return {
        data: [],
        count: total || 0,
        page,
        limit,
        total_pages: total_pages || 0,
      };
    }

    // Step 3: Fetch full lead data for the page's IDs only (max `limit` rows)
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
      .in('id', ids);

    if (fullError) {
      throw new Error(`Failed to fetch lead details: ${fullError.message}`);
    }

    // Step 4: Sort results to match the RPC's order (preserves pinned-first, assigned_at DESC)
    const idToLead = new Map((fullLeads || []).map(l => [l.id, l]));
    const sortedLeads = ids.map(id => idToLead.get(id)).filter(Boolean);

    // Step 5: Transform tags from nested join to flat array
    const transformedData = sortedLeads.map(lead => ({
      ...lead,
      tags: lead.tags?.map((lt: { tag?: Tables<'tags'> }) => lt.tag).filter(Boolean) || []
    }));

    return {
      data: transformedData,
      count: total,
      page,
      limit,
      total_pages: total_pages,
    };
  }

  /**
   * Aggregated lead metrics computed server-side over ALL matching rows.
   * Replaces client-side reduce over a capped page (which truncated totals).
   */
  async getLeadStats(assignedTo?: string | null): Promise<LeadStats> {
    const { data, error } = await supabase.rpc('get_lead_stats', {
      p_assigned_to: assignedTo || undefined,
    });
    if (error) {
      throw new Error(`Failed to fetch lead stats: ${error.message}`);
    }
    return data as unknown as LeadStats;
  }

  /** Per-creator lead counts (optionally within a created_at window), computed server-side. */
  async getLeadCountsByCreator(
    dateFrom?: string | null,
    dateTo?: string | null
  ): Promise<Record<string, number>> {
    const { data, error } = await supabase.rpc('get_lead_counts_by_creator', {
      p_date_from: dateFrom || undefined,
      p_date_to: dateTo || undefined,
    });
    if (error) {
      throw new Error(`Failed to fetch lead counts by creator: ${error.message}`);
    }
    return (data || []).reduce((acc, row) => {
      acc[row.created_by] = Number(row.lead_count);
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Real-time single-record duplicate check (Add New Lead / edit). Returns existing
   * non-deleted leads matching the incoming values on >=2 identity points, ranked by
   * strength, each tagged with which fields matched and a severity tier. Pass
   * `excludeId` when editing so the record can't match itself.
   */
  async checkLeadDuplicates(input: DuplicateCheckInput): Promise<DuplicateMatch[]> {
    const clean = (vals?: (string | null | undefined)[]) =>
      (vals || []).map((v) => (v ?? '').toString()).filter((v) => v.trim() !== '');
    const { data, error } = await supabase.rpc('check_lead_duplicates', {
      p_name: input.name || undefined,
      p_book: input.book || undefined,
      p_phones: clean(input.phones),
      p_emails: clean(input.emails),
      p_exclude_id: input.excludeId || undefined,
    });
    if (error) {
      throw new Error(`Failed to check for duplicates: ${error.message}`);
    }
    return (data || []) as unknown as DuplicateMatch[];
  }

  /**
   * Bulk import Pass-1: match many staged rows against the existing DB in one call.
   * Returns a map of row_no -> matches (a row may match multiple existing leads).
   */
  async checkLeadDuplicatesBatch(
    rows: BatchDuplicateRow[]
  ): Promise<Map<number, BatchDuplicateMatch[]>> {
    const clean = (vals?: (string | null | undefined)[]) =>
      (vals || []).map((v) => (v ?? '').toString()).filter((v) => v.trim() !== '');
    const payload = rows.map((r) => ({
      row_no: r.row_no,
      name: r.name || '',
      book: r.book || '',
      phones: clean(r.phones),
      emails: clean(r.emails),
    }));
    const { data, error } = await supabase.rpc('check_lead_duplicates_batch', {
      p_rows: payload as unknown as Json,
    });
    if (error) {
      throw new Error(`Failed to check import duplicates: ${error.message}`);
    }
    const byRow = new Map<number, BatchDuplicateMatch[]>();
    ((data || []) as unknown as BatchDuplicateMatch[]).forEach((m) => {
      const list = byRow.get(m.row_no) || [];
      list.push(m);
      byRow.set(m.row_no, list);
    });
    return byRow;
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