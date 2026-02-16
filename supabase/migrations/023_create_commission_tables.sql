-- Commission Tracker System - Database Migration
-- Migration: 023_create_commission_tables
-- Date: February 2026

-- ============================================
-- TABLE: commission_templates
-- ============================================
CREATE TABLE commission_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  calculation_type VARCHAR(20) NOT NULL CHECK (calculation_type IN ('graduated', 'flat_rate')),
  markup_commissionable_percent DECIMAL(5,2) DEFAULT 50.00,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: commission_tiers
-- ============================================
CREATE TABLE commission_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES commission_templates(id) ON DELETE CASCADE,
  min_amount DECIMAL(12,2) NOT NULL,
  max_amount DECIMAL(12,2),
  commission_percent DECIMAL(5,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_range CHECK (max_amount IS NULL OR max_amount > min_amount)
);

-- ============================================
-- TABLE: agent_commission_settings
-- ============================================
CREATE TABLE agent_commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  template_id UUID REFERENCES commission_templates(id) ON DELETE SET NULL,
  custom_commission_percent DECIMAL(5,2),
  custom_markup_percent DECIMAL(5,2),
  use_custom_override BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(agent_id)
);

-- ============================================
-- TABLE: commissions
-- ============================================
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES profiles(id),

  deal_value DECIMAL(12,2) NOT NULL,
  markup_amount DECIMAL(12,2) DEFAULT 0,
  base_commission_amount DECIMAL(12,2) NOT NULL,

  markup_commissionable_percent DECIMAL(5,2),
  markup_commission_amount DECIMAL(12,2) DEFAULT 0,
  company_markup_amount DECIMAL(12,2) DEFAULT 0,

  total_commission_amount DECIMAL(12,2) NOT NULL,

  template_id UUID REFERENCES commission_templates(id),
  template_name VARCHAR(100),
  calculation_type VARCHAR(20),
  tier_breakdown JSONB,

  is_overridden BOOLEAN DEFAULT false,
  override_amount DECIMAL(12,2),
  override_reason TEXT,
  overridden_by UUID REFERENCES profiles(id),
  overridden_at TIMESTAMPTZ,

  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  paid_at TIMESTAMPTZ,

  commission_period DATE,
  period_type VARCHAR(10) DEFAULT 'monthly' CHECK (period_type IN ('monthly', 'quarterly')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: commission_audit_log
-- ============================================
CREATE TABLE commission_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id UUID REFERENCES commissions(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  previous_values JSONB,
  new_values JSONB,
  performed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: company_revenue
-- ============================================
CREATE TABLE company_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  commission_id UUID REFERENCES commissions(id),
  revenue_type VARCHAR(30) NOT NULL CHECK (revenue_type IN ('markup_share', 'other')),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  revenue_period DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_commissions_deal_id ON commissions(deal_id);
CREATE INDEX idx_commissions_agent_id ON commissions(agent_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_period ON commissions(commission_period);
CREATE INDEX idx_commission_tiers_template_id ON commission_tiers(template_id);
CREATE INDEX idx_commission_audit_log_commission_id ON commission_audit_log(commission_id);
CREATE INDEX idx_company_revenue_deal_id ON company_revenue(deal_id);
CREATE INDEX idx_agent_commission_settings_agent_id ON agent_commission_settings(agent_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE commission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_revenue ENABLE ROW LEVEL SECURITY;

-- Commission Templates: Leads Manager manages, all can read active
CREATE POLICY "anyone_can_read_active_templates" ON commission_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "leads_manager_manage_templates" ON commission_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
    )
  );

-- Commission Tiers: follow template access
CREATE POLICY "anyone_can_read_tiers" ON commission_tiers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM commission_templates
      WHERE commission_templates.id = commission_tiers.template_id
      AND commission_templates.is_active = true
    )
  );

CREATE POLICY "leads_manager_manage_tiers" ON commission_tiers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
    )
  );

-- Agent Commission Settings: agent sees own, managers see team, admin sees all
CREATE POLICY "agents_view_own_settings" ON agent_commission_settings
  FOR SELECT USING (
    agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('sales_manager', 'leads_manager')
    )
  );

CREATE POLICY "leads_manager_manage_settings" ON agent_commission_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
    )
  );

-- Commissions: agent sees own, managers see team, admin sees all
CREATE POLICY "view_commissions" ON commissions
  FOR SELECT USING (
    agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('sales_manager', 'leads_manager')
    )
  );

CREATE POLICY "create_commissions" ON commissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('sales_manager', 'leads_manager')
    )
  );

CREATE POLICY "managers_update_commissions" ON commissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('sales_manager', 'leads_manager')
    )
  );

CREATE POLICY "leads_manager_delete_commissions" ON commissions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
    )
  );

-- Commission Audit Log: follows commission visibility
CREATE POLICY "view_audit_log" ON commission_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM commissions
      WHERE commissions.id = commission_audit_log.commission_id
      AND (
        commissions.agent_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('sales_manager', 'leads_manager')
        )
      )
    )
  );

CREATE POLICY "managers_insert_audit_log" ON commission_audit_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('sales_manager', 'leads_manager')
    )
  );

-- Company Revenue: managers and admin only
CREATE POLICY "managers_view_company_revenue" ON company_revenue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('sales_manager', 'leads_manager')
    )
  );

CREATE POLICY "leads_manager_manage_company_revenue" ON company_revenue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'leads_manager'
    )
  );

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_commission_templates_updated_at
  BEFORE UPDATE ON commission_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_commission_settings_updated_at
  BEFORE UPDATE ON agent_commission_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON commissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
