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
  async getMetrics(staleDays: number = 60): Promise<LeadManagerMetrics> {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - staleDays);
    const staleDateStr = staleDate.toISOString();

    // Get total active leads
    const { count: totalActiveLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    // Get unassigned leads
    const { count: unassignedLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .is('assigned_to', null);

    // Get all leads with their IDs for client-side processing
    const { data: allLeads } = await supabase
      .from('leads')
      .select('id, assigned_to')
      .is('deleted_at', null);
    
    const allLeadIds = new Set(allLeads?.map(l => l.id) || []);

    // Get unique lead IDs that have ANY activities
    const { data: leadsWithActivitiesData } = await supabase
      .from('activity_logs')
      .select('lead_id')
      .is('deleted_at', null);
    
    const leadIdsWithActivities = new Set(leadsWithActivitiesData?.map(a => a.lead_id) || []);

    // Get unique lead IDs with RECENT activities
    const { data: recentActivityData } = await supabase
      .from('activity_logs')
      .select('lead_id')
      .is('deleted_at', null)
      .gte('activity_date', staleDateStr);
    
    const recentLeadIds = new Set(recentActivityData?.map(a => a.lead_id) || []);

    // Calculate never touched (leads with zero activities)
    let neverTouchedLeads = 0;
    let wentColdLeads = 0;
    allLeadIds.forEach(id => {
      if (!leadIdsWithActivities.has(id)) {
        neverTouchedLeads++;
      } else if (!recentLeadIds.has(id)) {
        wentColdLeads++;
      }
    });

    // Get leads without tags
    const { data: leadsWithTagsData } = await supabase
      .from('lead_tags')
      .select('lead_id');
    
    const leadIdsWithTags = new Set(leadsWithTagsData?.map(lt => lt.lead_id) || []);
    let leadsWithoutTags = 0;
    allLeadIds.forEach(id => {
      if (!leadIdsWithTags.has(id)) {
        leadsWithoutTags++;
      }
    });

    // Get inactive agents
    const { data: inactiveAgents } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_active', false);
    
    const inactiveAgentIds = new Set(inactiveAgents?.map(a => a.id) || []);

    // Count orphaned leads (assigned to inactive agents) - client side
    let orphanedLeads = 0;
    if (inactiveAgentIds.size > 0) {
      allLeads?.forEach(lead => {
        if (lead.assigned_to && inactiveAgentIds.has(lead.assigned_to)) {
          orphanedLeads++;
        }
      });
    }

    // Get agent workloads
    const agentWorkloads = await this.getAgentWorkloads();

    // Calculate average leads per agent
    const activeAgents = agentWorkloads.filter(a => a.isActive);
    const activeAgentCount = activeAgents.length;
    const totalAssignedLeads = activeAgents.reduce((sum, a) => sum + a.totalLeads, 0);
    const averageLeadsPerAgent = activeAgentCount > 0 
      ? Math.round(totalAssignedLeads / activeAgentCount) 
      : 0;

    // Get tag distribution
    const tagDistribution = await this.getTagDistribution();

    // Get status distribution
    const statusDistribution = await this.getStatusDistribution();

    return {
      totalActiveLeads: totalActiveLeads || 0,
      unassignedLeads: unassignedLeads || 0,
      neverTouchedLeads,
      wentColdLeads,
      leadsWithoutTags,
      orphanedLeads,
      averageLeadsPerAgent,
      activeAgentCount,
      agentWorkloads,
      tagDistribution,
      statusDistribution,
    };
  }

  async getAgentWorkloads(): Promise<AgentWorkload[]> {
    // Get all sales and sales_manager profiles
    const { data: agents } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url, is_active')
      .in('role', ['sales', 'sales_manager']);

    if (!agents) return [];

    // Get all statuses for reference
    const { data: statuses } = await supabase
      .from('statuses')
      .select('id, name, color')
      .eq('is_active', true);

    const statusMap = new Map(statuses?.map(s => [s.id, { name: s.name, color: s.color }]) || []);

    // Get ALL leads with their assigned_to and status_id in one query
    const { data: allLeads } = await supabase
      .from('leads')
      .select('id, assigned_to, status_id')
      .is('deleted_at', null);

    // Get ALL lead_tags in one query
    const { data: allLeadTags } = await supabase
      .from('lead_tags')
      .select('lead_id');

    const taggedLeadIds = new Set(allLeadTags?.map(lt => lt.lead_id) || []);

    // Get latest activity per agent (using a different approach)
    const { data: latestActivities } = await supabase
      .from('activity_logs')
      .select('lead_id, activity_date, user_id')
      .is('deleted_at', null)
      .order('activity_date', { ascending: false });

    // Build a map of lead_id -> assigned_to for quick lookup
    const leadAssignmentMap = new Map<string, string>();
    allLeads?.forEach(lead => {
      if (lead.assigned_to) {
        leadAssignmentMap.set(lead.id, lead.assigned_to);
      }
    });

    // Find latest activity date per agent
    const agentLastActivity = new Map<string, string>();
    latestActivities?.forEach(activity => {
      const assignedTo = leadAssignmentMap.get(activity.lead_id);
      if (assignedTo && !agentLastActivity.has(assignedTo)) {
        agentLastActivity.set(assignedTo, activity.activity_date);
      }
    });

    // Build workloads using client-side aggregation
    const workloads: AgentWorkload[] = agents.map(agent => {
      // Filter leads for this agent
      const agentLeads = allLeads?.filter(l => l.assigned_to === agent.id) || [];
      const totalLeads = agentLeads.length;

      // Calculate status breakdown
      const statusCounts = new Map<string, number>();
      agentLeads.forEach(lead => {
        if (lead.status_id) {
          statusCounts.set(lead.status_id, (statusCounts.get(lead.status_id) || 0) + 1);
        }
      });

      const leadsByStatus = Array.from(statusCounts.entries()).map(([statusId, count]) => ({
        statusId,
        statusName: statusMap.get(statusId)?.name || 'Unknown',
        color: statusMap.get(statusId)?.color || '#6B7280',
        count,
      })).sort((a, b) => b.count - a.count);

      // Count leads with tags
      const leadsWithTags = agentLeads.filter(l => taggedLeadIds.has(l.id)).length;

      // Get last activity date
      const lastActivityDate = agentLastActivity.get(agent.id) || null;

      return {
        userId: agent.id,
        fullName: agent.full_name || 'Unknown',
        email: agent.email || '',
        role: agent.role as 'sales' | 'sales_manager',
        avatarUrl: agent.avatar_url,
        isActive: agent.is_active,
        totalLeads,
        leadsByStatus,
        leadsWithTags,
        lastActivityDate,
      };
    });

    // Sort by total leads descending
    return workloads.sort((a, b) => b.totalLeads - a.totalLeads);
  }

  async getTagDistribution(): Promise<TagDistribution[]> {
    // Get all active tags
    const { data: tags } = await supabase
      .from('tags')
      .select('id, name, color')
      .eq('is_active', true);

    if (!tags) return [];

    // Get all lead_tags with lead info to filter deleted leads
    const { data: leadTagsWithLeads } = await supabase
      .from('lead_tags')
      .select('tag_id, lead_id, leads!inner(deleted_at)')
      .is('leads.deleted_at', null);

    // Count tags
    const tagCounts = new Map<string, number>();
    leadTagsWithLeads?.forEach(lt => {
      tagCounts.set(lt.tag_id, (tagCounts.get(lt.tag_id) || 0) + 1);
    });

    const distribution: TagDistribution[] = tags.map(tag => ({
      tagId: tag.id,
      tagName: tag.name,
      color: tag.color,
      count: tagCounts.get(tag.id) || 0,
    }));

    return distribution.sort((a, b) => b.count - a.count);
  }

  async getStatusDistribution(): Promise<StatusDistribution[]> {
    const { data: statuses } = await supabase
      .from('statuses')
      .select('id, name, color, order_index')
      .eq('is_active', true)
      .order('order_index');

    if (!statuses) return [];

    // Get all leads with status
    const { data: leads } = await supabase
      .from('leads')
      .select('status_id')
      .is('deleted_at', null);

    // Count by status client-side
    const statusCounts = new Map<string, number>();
    leads?.forEach(lead => {
      if (lead.status_id) {
        statusCounts.set(lead.status_id, (statusCounts.get(lead.status_id) || 0) + 1);
      }
    });

    return statuses.map(status => ({
      statusId: status.id,
      statusName: status.name,
      color: status.color,
      count: statusCounts.get(status.id) || 0,
    }));
  }

  async getNeverTouchedLeads(page: number = 1, limit: number = 20) {
    // Get all lead IDs that have activities
    const { data: leadsWithActivities } = await supabase
      .from('activity_logs')
      .select('lead_id')
      .is('deleted_at', null);
    
    const leadIdsWithActivities = new Set(leadsWithActivities?.map(a => a.lead_id) || []);

    // Get all leads
    const { data: allLeads, count: totalCount } = await supabase
      .from('leads')
      .select(`
        *,
        status:statuses(id, name, color),
        assigned_to_profile:profiles!leads_assigned_to_fkey(id, full_name, avatar_url, is_active),
        tags:lead_tags(tag:tags(id, name, color))
      `, { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    // Filter client-side to avoid URL length issues
    const neverTouchedLeads = allLeads?.filter(l => !leadIdsWithActivities.has(l.id)) || [];
    
    // Paginate client-side
    const startIndex = (page - 1) * limit;
    const paginatedLeads = neverTouchedLeads.slice(startIndex, startIndex + limit);
    const total = neverTouchedLeads.length;

    return {
      data: paginatedLeads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getWentColdLeads(staleDays: number = 60, page: number = 1, limit: number = 20) {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - staleDays);
    const staleDateStr = staleDate.toISOString();

    // Get lead IDs with recent activity
    const { data: recentActivityLeads } = await supabase
      .from('activity_logs')
      .select('lead_id')
      .is('deleted_at', null)
      .gte('activity_date', staleDateStr);
    
    const recentLeadIds = new Set(recentActivityLeads?.map(a => a.lead_id) || []);

    // Get lead IDs with any activity
    const { data: allActivityLeads } = await supabase
      .from('activity_logs')
      .select('lead_id')
      .is('deleted_at', null);
    
    const allActivityLeadIds = new Set(allActivityLeads?.map(a => a.lead_id) || []);

    // Get all leads
    const { data: allLeads } = await supabase
      .from('leads')
      .select(`
        *,
        status:statuses(id, name, color),
        assigned_to_profile:profiles!leads_assigned_to_fkey(id, full_name, avatar_url, is_active),
        tags:lead_tags(tag:tags(id, name, color))
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    // Filter: has activity but not recent
    const wentColdLeads = allLeads?.filter(l => 
      allActivityLeadIds.has(l.id) && !recentLeadIds.has(l.id)
    ) || [];

    // Paginate client-side
    const startIndex = (page - 1) * limit;
    const paginatedLeads = wentColdLeads.slice(startIndex, startIndex + limit);
    const total = wentColdLeads.length;

    return {
      data: paginatedLeads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrphanedLeads(page: number = 1, limit: number = 20) {
    // Get inactive agent IDs
    const { data: inactiveAgents } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_active', false);
    
    const inactiveAgentIds = new Set(inactiveAgents?.map(a => a.id) || []);

    if (inactiveAgentIds.size === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    // Get all leads
    const { data: allLeads } = await supabase
      .from('leads')
      .select(`
        *,
        status:statuses(id, name, color),
        assigned_to_profile:profiles!leads_assigned_to_fkey(id, full_name, avatar_url, is_active),
        tags:lead_tags(tag:tags(id, name, color))
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    // Filter client-side
    const orphanedLeads = allLeads?.filter(l => 
      l.assigned_to && inactiveAgentIds.has(l.assigned_to)
    ) || [];

    // Paginate client-side
    const startIndex = (page - 1) * limit;
    const paginatedLeads = orphanedLeads.slice(startIndex, startIndex + limit);
    const total = orphanedLeads.length;

    return {
      data: paginatedLeads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnassignedLeads(page: number = 1, limit: number = 20) {
    const { data, count, error } = await supabase
      .from('leads')
      .select(`
        *,
        status:statuses(id, name, color),
        created_by_profile:profiles!leads_created_by_fkey(id, full_name, avatar_url),
        tags:lead_tags(tag:tags(id, name, color))
      `, { count: 'exact' })
      .is('deleted_at', null)
      .is('assigned_to', null)
      .order('created_at', { ascending: true })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async getLeadsByAgent(userId: string, page: number = 1, limit: number = 20) {
    const { data, count, error } = await supabase
      .from('leads')
      .select(`
        *,
        status:statuses(id, name, color),
        assigned_to_profile:profiles!leads_assigned_to_fkey(id, full_name, avatar_url, is_active),
        tags:lead_tags(tag:tags(id, name, color))
      `, { count: 'exact' })
      .is('deleted_at', null)
      .eq('assigned_to', userId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async getLeadsByTag(tagId: string, page: number = 1, limit: number = 20) {
    // Get lead IDs with this tag
    const { data: leadTags } = await supabase
      .from('lead_tags')
      .select('lead_id')
      .eq('tag_id', tagId);

    const leadIds = new Set(leadTags?.map(lt => lt.lead_id) || []);

    if (leadIds.size === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    // Get all leads and filter client-side
    const { data: allLeads } = await supabase
      .from('leads')
      .select(`
        *,
        status:statuses(id, name, color),
        assigned_to_profile:profiles!leads_assigned_to_fkey(id, full_name, avatar_url, is_active),
        tags:lead_tags(tag:tags(id, name, color))
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    const filteredLeads = allLeads?.filter(l => leadIds.has(l.id)) || [];

    // Paginate client-side
    const startIndex = (page - 1) * limit;
    const paginatedLeads = filteredLeads.slice(startIndex, startIndex + limit);
    const total = filteredLeads.length;

    return {
      data: paginatedLeads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getLeadsWithoutTags(page: number = 1, limit: number = 20) {
    // Get all lead IDs that have tags
    const { data: leadsWithTags } = await supabase
      .from('lead_tags')
      .select('lead_id');
    
    const leadIdsWithTags = new Set(leadsWithTags?.map(lt => lt.lead_id) || []);

    // Get all leads
    const { data: allLeads } = await supabase
      .from('leads')
      .select(`
        *,
        status:statuses(id, name, color),
        assigned_to_profile:profiles!leads_assigned_to_fkey(id, full_name, avatar_url, is_active),
        tags:lead_tags(tag:tags(id, name, color))
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    // Filter client-side
    const leadsWithoutTags = allLeads?.filter(l => !leadIdsWithTags.has(l.id)) || [];

    // Paginate client-side
    const startIndex = (page - 1) * limit;
    const paginatedLeads = leadsWithoutTags.slice(startIndex, startIndex + limit);
    const total = leadsWithoutTags.length;

    return {
      data: paginatedLeads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async autoAssignLeads(leadIds: string[]): Promise<{ assignments: { leadId: string; assignedTo: string; agentName: string }[] }> {
    // Get active agents with their current workloads
    const { data: agents } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('role', ['sales', 'sales_manager'])
      .eq('is_active', true);

    if (!agents || agents.length === 0) {
      throw new Error('No active agents available for assignment');
    }

    // Get all leads to count per agent
    const { data: allLeads } = await supabase
      .from('leads')
      .select('assigned_to')
      .is('deleted_at', null);

    // Count leads per agent
    const agentCounts: { id: string; name: string; count: number }[] = agents.map(agent => ({
      id: agent.id,
      name: agent.full_name || 'Unknown',
      count: allLeads?.filter(l => l.assigned_to === agent.id).length || 0,
    }));

    // Sort by count ascending (lowest first)
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
        agent.count++; // Update local count
      }

      agentIndex++;
    }

    return { assignments };
  }
}

export const leadManagerMetricsApi = new LeadManagerMetricsApi();
