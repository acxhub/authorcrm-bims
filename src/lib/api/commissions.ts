import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate, Json } from '@/integrations/supabase/types';
import { calculateCommission } from './commission-calculator';
import type { CommissionCalculationInput } from './commission-calculator';

export type Commission = Tables<'commissions'> & {
  deal?: Tables<'deals'> & {
    lead?: Tables<'leads'>;
  };
  agent_profile?: Tables<'profiles'> | null;
  approved_by_profile?: Tables<'profiles'> | null;
  overridden_by_profile?: Tables<'profiles'> | null;
  template?: Tables<'commission_templates'> | null;
};

export type CreateCommissionData = TablesInsert<'commissions'>;
export type UpdateCommissionData = TablesUpdate<'commissions'>;

export type AgentCommissionSettings = Tables<'agent_commission_settings'> & {
  template?: Tables<'commission_templates'> | null;
  agent_profile?: Tables<'profiles'> | null;
};

export type CommissionAuditLogEntry = Tables<'commission_audit_log'> & {
  performed_by_profile?: Tables<'profiles'> | null;
};

export interface CommissionsFilter {
  agent_id?: string;
  status?: string;
  period_start?: string;
  period_end?: string;
  period_type?: string;
  deal_id?: string;
}

export interface PaginatedCommissionsResponse {
  data: Commission[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CommissionAggregateSummary {
  agent_id: string;
  agent_name: string;
  period: string;
  total_deals: number;
  total_deal_value: number;
  total_commission: number;
  paid_commission: number;
  pending_commission: number;
  approved_commission: number;
}

const COMMISSION_SELECT = `
  *,
  deal:deals(
    *,
    lead:leads(*)
  ),
  agent_profile:profiles!commissions_agent_id_fkey(*),
  approved_by_profile:profiles!commissions_approved_by_fkey(*),
  overridden_by_profile:profiles!commissions_overridden_by_fkey(*),
  template:commission_templates(*)
`;

const AGENT_SETTINGS_SELECT = `
  *,
  template:commission_templates(*),
  agent_profile:profiles!agent_commission_settings_agent_id_fkey(*)
`;

export class CommissionsAPI {
  async getCommissions(
    filters: CommissionsFilter = {},
    page = 1,
    limit = 10
  ): Promise<PaginatedCommissionsResponse> {
    let query = supabase
      .from('commissions')
      .select(COMMISSION_SELECT, { count: 'exact' });

    if (filters.agent_id) {
      query = query.eq('agent_id', filters.agent_id);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.deal_id) {
      query = query.eq('deal_id', filters.deal_id);
    }

    if (filters.period_type) {
      query = query.eq('period_type', filters.period_type);
    }

    if (filters.period_start) {
      query = query.gte('commission_period', filters.period_start);
    }

    if (filters.period_end) {
      query = query.lte('commission_period', filters.period_end);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch commissions: ${error.message}`);
    }

    return {
      data: data || [],
      count: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    };
  }

  async getCommissionById(id: string): Promise<Commission> {
    const { data, error } = await supabase
      .from('commissions')
      .select(COMMISSION_SELECT)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch commission: ${error.message}`);
    }

    return data;
  }

  async getCommissionsByDealId(dealId: string): Promise<Commission[]> {
    const { data, error } = await supabase
      .from('commissions')
      .select(COMMISSION_SELECT)
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch commissions for deal: ${error.message}`);
    }

    return data || [];
  }

  async getCommissionsByAgentId(agentId: string): Promise<Commission[]> {
    const { data, error } = await supabase
      .from('commissions')
      .select(COMMISSION_SELECT)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch commissions for agent: ${error.message}`);
    }

    return data || [];
  }

  async createCommission(commissionData: CreateCommissionData): Promise<Commission> {
    const { data, error } = await supabase
      .from('commissions')
      .insert(commissionData)
      .select(COMMISSION_SELECT)
      .single();

    if (error) {
      throw new Error(`Failed to create commission: ${error.message}`);
    }

    // Create audit log entry
    await this.createAuditLog(data.id, 'created', null, commissionData as unknown as Json, commissionData.agent_id || null);

    return data;
  }

  async updateCommission(id: string, updates: UpdateCommissionData): Promise<Commission> {
    const { data, error } = await supabase
      .from('commissions')
      .update(updates)
      .eq('id', id)
      .select(COMMISSION_SELECT)
      .single();

    if (error) {
      throw new Error(`Failed to update commission: ${error.message}`);
    }

    return data;
  }

  async overrideCommission(
    id: string,
    amount: number,
    reason: string,
    overriddenBy: string
  ): Promise<Commission> {
    // Get current values for audit
    const current = await this.getCommissionById(id);

    const { data, error } = await supabase
      .from('commissions')
      .update({
        is_overridden: true,
        override_amount: amount,
        override_reason: reason,
        overridden_by: overriddenBy,
        overridden_at: new Date().toISOString(),
        total_commission_amount: amount,
      })
      .eq('id', id)
      .select(COMMISSION_SELECT)
      .single();

    if (error) {
      throw new Error(`Failed to override commission: ${error.message}`);
    }

    await this.createAuditLog(
      id,
      'overridden',
      { total_commission_amount: current.total_commission_amount } as unknown as Json,
      { total_commission_amount: amount, override_reason: reason } as unknown as Json,
      overriddenBy,
      `Override from $${current.total_commission_amount} to $${amount}: ${reason}`
    );

    return data;
  }

  async approveCommission(id: string, approvedBy: string): Promise<Commission> {
    const { data, error } = await supabase
      .from('commissions')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(COMMISSION_SELECT)
      .single();

    if (error) {
      throw new Error(`Failed to approve commission: ${error.message}`);
    }

    await this.createAuditLog(id, 'approved', { status: 'pending' } as unknown as Json, { status: 'approved' } as unknown as Json, approvedBy);

    return data;
  }

  async rejectCommission(id: string, reason: string, rejectedBy: string): Promise<Commission> {
    const { data, error } = await supabase
      .from('commissions')
      .update({
        status: 'rejected',
        rejection_reason: reason,
      })
      .eq('id', id)
      .select(COMMISSION_SELECT)
      .single();

    if (error) {
      throw new Error(`Failed to reject commission: ${error.message}`);
    }

    await this.createAuditLog(
      id,
      'rejected',
      { status: 'pending' } as unknown as Json,
      { status: 'rejected', rejection_reason: reason } as unknown as Json,
      rejectedBy,
      reason
    );

    return data;
  }

  async markCommissionPaid(id: string, paidBy: string): Promise<Commission> {
    const { data, error } = await supabase
      .from('commissions')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(COMMISSION_SELECT)
      .single();

    if (error) {
      throw new Error(`Failed to mark commission as paid: ${error.message}`);
    }

    await this.createAuditLog(id, 'paid', { status: 'approved' } as unknown as Json, { status: 'paid' } as unknown as Json, paidBy);

    return data;
  }

  async bulkApproveCommissions(ids: string[], approvedBy: string): Promise<void> {
    const { error } = await supabase
      .from('commissions')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
      .in('id', ids);

    if (error) {
      throw new Error(`Failed to bulk approve commissions: ${error.message}`);
    }

    // Create audit logs for each
    for (const id of ids) {
      await this.createAuditLog(id, 'approved', { status: 'pending' } as unknown as Json, { status: 'approved' } as unknown as Json, approvedBy, 'Bulk approved');
    }
  }

  // Agent Commission Settings
  async getAgentSettings(agentId: string): Promise<AgentCommissionSettings | null> {
    const { data, error } = await supabase
      .from('agent_commission_settings')
      .select(AGENT_SETTINGS_SELECT)
      .eq('agent_id', agentId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch agent commission settings: ${error.message}`);
    }

    return data;
  }

  async getAllAgentSettings(): Promise<AgentCommissionSettings[]> {
    const { data, error } = await supabase
      .from('agent_commission_settings')
      .select(AGENT_SETTINGS_SELECT)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch agent commission settings: ${error.message}`);
    }

    return data || [];
  }

  async upsertAgentSettings(
    agentId: string,
    settings: Partial<TablesInsert<'agent_commission_settings'>>
  ): Promise<AgentCommissionSettings> {
    const { data, error } = await supabase
      .from('agent_commission_settings')
      .upsert(
        { agent_id: agentId, ...settings },
        { onConflict: 'agent_id' }
      )
      .select(AGENT_SETTINGS_SELECT)
      .single();

    if (error) {
      throw new Error(`Failed to update agent commission settings: ${error.message}`);
    }

    return data;
  }

  // Audit Log
  async getAuditLog(commissionId: string): Promise<CommissionAuditLogEntry[]> {
    const { data, error } = await supabase
      .from('commission_audit_log')
      .select(`
        *,
        performed_by_profile:profiles!commission_audit_log_performed_by_fkey(*)
      `)
      .eq('commission_id', commissionId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch commission audit log: ${error.message}`);
    }

    return data || [];
  }

  private async createAuditLog(
    commissionId: string,
    action: string,
    previousValues: Json | null,
    newValues: Json | null,
    performedBy: string | null,
    notes?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('commission_audit_log')
      .insert({
        commission_id: commissionId,
        action,
        previous_values: previousValues,
        new_values: newValues,
        performed_by: performedBy,
        notes: notes || null,
      });

    if (error) {
      console.warn(`Failed to create audit log for commission ${commissionId}:`, error.message);
    }
  }

  // Company Revenue
  async createCompanyRevenue(data: TablesInsert<'company_revenue'>): Promise<void> {
    const { error } = await supabase
      .from('company_revenue')
      .insert(data);

    if (error) {
      throw new Error(`Failed to create company revenue record: ${error.message}`);
    }
  }

  // Orchestrate: fetch settings + template + calculate + create commission
  async createCommissionForDeal(
    dealId: string,
    agentId: string,
    dealValue: number,
    markupAmount = 0
  ): Promise<Commission> {
    // 1. Fetch agent settings
    const agentSettings = await this.getAgentSettings(agentId);

    // 2. Determine template: agent-specific or default
    let templateId = agentSettings?.template_id;
    if (!templateId) {
      const { data: defaultTemplate } = await supabase
        .from('commission_templates')
        .select('id')
        .eq('is_default', true)
        .eq('is_active', true)
        .maybeSingle();
      templateId = defaultTemplate?.id || null;
    }

    if (!templateId) {
      throw new Error('No commission template assigned to this agent and no default template exists. Please configure commission templates in Admin Panel.');
    }

    // 3. Fetch template with tiers
    const { data: template, error: templateError } = await supabase
      .from('commission_templates')
      .select('*, commission_tiers(*)')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      throw new Error(`Failed to fetch commission template: ${templateError?.message || 'not found'}`);
    }

    const tiers = (template.commission_tiers || []).sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
    );

    // 4. Calculate commission
    const calcInput: CommissionCalculationInput = {
      dealValue,
      markupAmount,
      template: {
        id: template.id,
        name: template.name,
        calculation_type: template.calculation_type,
        markup_commissionable_percent: template.markup_commissionable_percent,
      },
      tiers: tiers.map(t => ({
        id: t.id,
        min_amount: t.min_amount,
        max_amount: t.max_amount,
        commission_percent: t.commission_percent,
        sort_order: t.sort_order,
      })),
      agentSettings: agentSettings
        ? {
            custom_commission_percent: agentSettings.custom_commission_percent,
            custom_markup_percent: agentSettings.custom_markup_percent,
            use_custom_override: agentSettings.use_custom_override,
          }
        : null,
    };

    const result = calculateCommission(calcInput);

    // 5. Create the commission record
    const now = new Date();
    const commissionPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const commission = await this.createCommission({
      deal_id: dealId,
      agent_id: agentId,
      deal_value: dealValue,
      markup_amount: markupAmount,
      base_commission_amount: result.baseCommissionAmount,
      markup_commissionable_percent: result.markupCommissionablePercent,
      markup_commission_amount: result.markupCommissionAmount,
      company_markup_amount: result.companyMarkupAmount,
      total_commission_amount: result.totalCommissionAmount,
      template_id: templateId,
      template_name: template.name,
      calculation_type: result.calculationType,
      tier_breakdown: result.tierBreakdown as unknown as Json,
      commission_period: commissionPeriod,
      status: 'pending',
    });

    // 6. Create company revenue record if there's company markup
    if (result.companyMarkupAmount > 0) {
      await this.createCompanyRevenue({
        deal_id: dealId,
        commission_id: commission.id,
        revenue_type: 'markup_share',
        amount: result.companyMarkupAmount,
        description: `Company markup share from deal commission`,
        revenue_period: commissionPeriod,
      }).catch(err => console.warn('Failed to create company revenue record:', err));
    }

    return commission;
  }

  async getCompanyRevenueSummary(periodStart?: string, periodEnd?: string): Promise<Tables<'company_revenue'>[]> {
    let query = supabase
      .from('company_revenue')
      .select('*')
      .order('revenue_period', { ascending: false });

    if (periodStart) {
      query = query.gte('revenue_period', periodStart);
    }

    if (periodEnd) {
      query = query.lte('revenue_period', periodEnd);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch company revenue: ${error.message}`);
    }

    return data || [];
  }
}

export const commissionsApi = new CommissionsAPI();
