import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type CommissionTemplate = Tables<'commission_templates'>;
export type CommissionTier = Tables<'commission_tiers'>;
export type CreateCommissionTemplateData = TablesInsert<'commission_templates'>;
export type UpdateCommissionTemplateData = TablesUpdate<'commission_templates'>;
export type CreateCommissionTierData = TablesInsert<'commission_tiers'>;
export type UpdateCommissionTierData = TablesUpdate<'commission_tiers'>;

export type CommissionTemplateWithTiers = CommissionTemplate & {
  commission_tiers: CommissionTier[];
  created_by_profile?: Tables<'profiles'> | null;
};

const TEMPLATE_SELECT = `
  *,
  commission_tiers(*),
  created_by_profile:profiles!commission_templates_created_by_fkey(*)
`;

export class CommissionTemplatesAPI {
  async getTemplates(): Promise<CommissionTemplateWithTiers[]> {
    const { data, error } = await supabase
      .from('commission_templates')
      .select(TEMPLATE_SELECT)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch commission templates: ${error.message}`);
    }

    return (data || []).map(t => ({
      ...t,
      commission_tiers: (t.commission_tiers || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    }));
  }

  async getTemplateById(id: string): Promise<CommissionTemplateWithTiers> {
    const { data, error } = await supabase
      .from('commission_templates')
      .select(TEMPLATE_SELECT)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch commission template: ${error.message}`);
    }

    return {
      ...data,
      commission_tiers: (data.commission_tiers || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    };
  }

  async createTemplate(templateData: CreateCommissionTemplateData): Promise<CommissionTemplateWithTiers> {
    const { data, error } = await supabase
      .from('commission_templates')
      .insert(templateData)
      .select(TEMPLATE_SELECT)
      .single();

    if (error) {
      throw new Error(`Failed to create commission template: ${error.message}`);
    }

    return data;
  }

  async updateTemplate(id: string, updates: UpdateCommissionTemplateData): Promise<CommissionTemplateWithTiers> {
    const { data, error } = await supabase
      .from('commission_templates')
      .update(updates)
      .eq('id', id)
      .select(TEMPLATE_SELECT)
      .single();

    if (error) {
      throw new Error(`Failed to update commission template: ${error.message}`);
    }

    return data;
  }

  async deleteTemplate(id: string): Promise<void> {
    // Soft delete
    const { error } = await supabase
      .from('commission_templates')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete commission template: ${error.message}`);
    }
  }

  async setDefaultTemplate(id: string): Promise<void> {
    // Remove default from all templates first
    const { error: clearError } = await supabase
      .from('commission_templates')
      .update({ is_default: false })
      .eq('is_default', true);

    if (clearError) {
      throw new Error(`Failed to clear default template: ${clearError.message}`);
    }

    // Set new default
    const { error } = await supabase
      .from('commission_templates')
      .update({ is_default: true })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to set default template: ${error.message}`);
    }
  }

  // Tier management
  async createTier(tierData: CreateCommissionTierData): Promise<CommissionTier> {
    const { data, error } = await supabase
      .from('commission_tiers')
      .insert(tierData)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create commission tier: ${error.message}`);
    }

    return data;
  }

  async updateTier(id: string, updates: UpdateCommissionTierData): Promise<CommissionTier> {
    const { data, error } = await supabase
      .from('commission_tiers')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update commission tier: ${error.message}`);
    }

    return data;
  }

  async deleteTier(id: string): Promise<void> {
    const { error } = await supabase
      .from('commission_tiers')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete commission tier: ${error.message}`);
    }
  }
}

export const commissionTemplatesApi = new CommissionTemplatesAPI();
