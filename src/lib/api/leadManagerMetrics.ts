import { supabase } from '@/integrations/supabase/client';

export interface AgentWorkload {
  userId: string;
  fullName: string;
  email: string;
  role: 'sales' | 'sales_manager' | 'leads_manager';
  avatarUrl: string | null;
  isActive: boolean;
  totalLeads: number;
  leadsByStatus: { statusId: string; statusName: string; color: string; count: number }[];
  leadsWithTags: number;
  lastActivityDate: string | null;
}

export interface TagDistribution {
  tagId: string;
  tagName: string;
  color: string;
  count: number;
}

export interface StatusDistribution {
  statusId: string;
  statusName: string;
  color: string;
  count: number;
}

export interface LeadManagerMetrics {
  totalActiveLeads: number;
  unassignedLeads: number;
  neverTouchedLeads: number;
  wentColdLeads: number;
  leadsWithoutTags: number;
  orphanedLeads: number;
  averageLeadsPerAgent: number;
  activeAgentCount: number;
  agentWorkloads: AgentWorkload[];
  tagDistribution: TagDistribution[];
  statusDistribution: StatusDistribution[];
}

class LeadManagerMetricsApi {
  /**
   * Fetch full lead data for a set of IDs (max ~50 per page, no URL length issues).
   * Preserves the order from the input array.
   */
  private async fetchLeadsByIds(ids: string[]) {
    if (!ids || ids.length === 0) return [];

    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        status:statuses(id, name, color),
        assigned_to_profile:profiles!leads_assigned_to_fkey(id, full_name, avatar_url, is_active),
        created_by_profile:profiles!leads_created_by_fkey(id, full_name, avatar_url),
        tags:lead_tags(tag:tags(id, name, color))
      `)
      .in('id', ids);

    if (error) throw error;

    // Preserve RPC order
    const idToLead = new Map((data || []).map(l => [l.id, l]));
    return ids.map(id => idToLead.get(id)).filter(Boolean);
  }

  /**
   * Generic paginated lead fetcher using the get_lead_manager_leads RPC.
   * Step 1: RPC returns filtered+sorted lead IDs + counts
   * Step 2: Fetch full data for only the page's IDs
   */
  private async fetchPaginatedLeads(
    filterType: string,
    params: { page?: number; limit?: number; staleDays?: number; tagId?: string; agentId?: string } = {}
  ) {
    const page = params.page || 1;
    const limit = params.limit || 20;

    const { data: rpcResult, error } = await supabase.rpc('get_lead_manager_leads', {
      p_filter_type: filterType,
      p_stale_days: params.staleDays || 60,
      p_tag_id: params.tagId || null,
      p_agent_id: params.agentId || null,
      p_page: page,
      p_limit: limit,
    });

    if (error) throw new Error(`Failed to fetch ${filterType} leads: ${error.message}`);

    const { ids, total, total_pages } = rpcResult as { ids: string[]; total: number; total_pages: number };
    const leads = await this.fetchLeadsByIds(ids || []);

    return {
      data: leads,
      total: total || 0,
      page,
      limit,
      totalPages: total_pages || 0,
    };
  }

  /**
   * Dashboard metrics - 4 parallel RPC calls instead of 8+ queries fetching entire tables.
   */
  async getMetrics(staleDays: number = 60): Promise<LeadManagerMetrics> {
    const [countsResult, workloadsResult, statusResult, tagResult] = await Promise.all([
      supabase.rpc('get_lead_manager_counts', { p_stale_days: staleDays }),
      supabase.rpc('get_lead_manager_agent_workloads'),
      supabase.rpc('get_status_distribution'),
      supabase.rpc('get_tag_distribution'),
    ]);

    if (countsResult.error) throw new Error(`Counts: ${countsResult.error.message}`);
    if (workloadsResult.error) throw new Error(`Workloads: ${workloadsResult.error.message}`);
    if (statusResult.error) throw new Error(`Status dist: ${statusResult.error.message}`);
    if (tagResult.error) throw new Error(`Tag dist: ${tagResult.error.message}`);

    const counts = countsResult.data as {
      total_active: number;
      unassigned: number;
      never_touched: number;
      went_cold: number;
      without_tags: number;
      orphaned: number;
    };

    const agentWorkloads: AgentWorkload[] = workloadsResult.data || [];
    const statusDistribution: StatusDistribution[] = statusResult.data || [];
    const tagDistribution: TagDistribution[] = tagResult.data || [];

    const activeAgents = agentWorkloads.filter(a => a.isActive);
    const activeAgentCount = activeAgents.length;
    const totalAssignedLeads = activeAgents.reduce((sum, a) => sum + a.totalLeads, 0);
    const averageLeadsPerAgent = activeAgentCount > 0
      ? Math.round(totalAssignedLeads / activeAgentCount)
      : 0;

    return {
      totalActiveLeads: counts.total_active,
      unassignedLeads: counts.unassigned,
      neverTouchedLeads: counts.never_touched,
      wentColdLeads: counts.went_cold,
      leadsWithoutTags: counts.without_tags,
      orphanedLeads: counts.orphaned,
      averageLeadsPerAgent,
      activeAgentCount,
      agentWorkloads,
      tagDistribution,
      statusDistribution,
    };
  }

  async getAgentWorkloads(): Promise<AgentWorkload[]> {
    const { data, error } = await supabase.rpc('get_lead_manager_agent_workloads');
    if (error) throw new Error(`Failed to fetch agent workloads: ${error.message}`);
    return data || [];
  }

  async getTagDistribution(): Promise<TagDistribution[]> {
    const { data, error } = await supabase.rpc('get_tag_distribution');
    if (error) throw new Error(`Failed to fetch tag distribution: ${error.message}`);
    return data || [];
  }

  async getStatusDistribution(): Promise<StatusDistribution[]> {
    const { data, error } = await supabase.rpc('get_status_distribution');
    if (error) throw new Error(`Failed to fetch status distribution: ${error.message}`);
    return data || [];
  }

  async getNeverTouchedLeads(page: number = 1, limit: number = 20) {
    return this.fetchPaginatedLeads('never_touched', { page, limit });
  }

  async getWentColdLeads(staleDays: number = 60, page: number = 1, limit: number = 20) {
    return this.fetchPaginatedLeads('went_cold', { staleDays, page, limit });
  }

  async getOrphanedLeads(page: number = 1, limit: number = 20) {
    return this.fetchPaginatedLeads('orphaned', { page, limit });
  }

  async getUnassignedLeads(page: number = 1, limit: number = 20) {
    return this.fetchPaginatedLeads('unassigned', { page, limit });
  }

  async getLeadsByAgent(userId: string, page: number = 1, limit: number = 20) {
    return this.fetchPaginatedLeads('by_agent', { agentId: userId, page, limit });
  }

  async getLeadsByTag(tagId: string, page: number = 1, limit: number = 20) {
    return this.fetchPaginatedLeads('by_tag', { tagId, page, limit });
  }

  async getLeadsWithoutTags(page: number = 1, limit: number = 20) {
    return this.fetchPaginatedLeads('no_tags', { page, limit });
  }

  async autoAssignLeads(leadIds: string[]): Promise<{ assignments: { leadId: string; assignedTo: string; agentName: string }[] }> {
    // Get active agents
    const { data: agents } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('role', ['sales', 'sales_manager'])
      .eq('is_active', true);

    if (!agents || agents.length === 0) {
      throw new Error('No active agents available for assignment');
    }

    // Get current lead counts per agent via RPC (instead of fetching ALL leads)
    const { data: countsData, error: countsError } = await supabase.rpc('get_agent_lead_counts');
    if (countsError) throw new Error(`Failed to get agent counts: ${countsError.message}`);

    const countMap = new Map(
      ((countsData || []) as { agent_id: string; count: number }[]).map(c => [c.agent_id, c.count])
    );

    const agentCounts = agents.map(agent => ({
      id: agent.id,
      name: agent.full_name || 'Unknown',
      count: countMap.get(agent.id) || 0,
    }));

    // Sort by count ascending (lowest first for round-robin)
    agentCounts.sort((a, b) => a.count - b.count);

    // Assign leads in round-robin fashion starting from lowest workload
    const assignments: { leadId: string; assignedTo: string; agentName: string }[] = [];
    let agentIndex = 0;

    for (const leadId of leadIds) {
      const agent = agentCounts[agentIndex % agentCounts.length];

      const { error } = await supabase
        .from('leads')
        .update({
          assigned_to: agent.id,
          assigned_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (!error) {
        assignments.push({
          leadId,
          assignedTo: agent.id,
          agentName: agent.name,
        });
        agent.count++;
      }

      agentIndex++;
    }

    return { assignments };
  }
}

export const leadManagerMetricsApi = new LeadManagerMetricsApi();
