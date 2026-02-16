-- Commission System - RLS Fixes & Database Safeguards
-- Migration: 024_fix_commission_rls_and_add_safeguards
-- Date: February 2026
--
-- Fixes:
-- 1. RLS: Allow any authenticated user to INSERT commissions (triggered by deal status change)
-- 2. RLS: Allow any authenticated user to INSERT audit log entries (created alongside commissions)
-- 3. RLS: Allow any authenticated user to INSERT company revenue (created alongside commissions)
-- 4. Add unique constraint to prevent duplicate commissions per deal+agent
-- 5. Add trigger to ensure only one default commission template at a time

-- ============================================
-- FIX 1: Commission INSERT policy
-- Current: Only sales_manager/leads_manager can insert
-- Problem: Sales agents trigger commission creation when deals move to "Closed Won"
-- Fix: Allow any authenticated user to insert commissions
-- ============================================
DROP POLICY IF EXISTS "create_commissions" ON commissions;

CREATE POLICY "authenticated_create_commissions" ON commissions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- FIX 2: Audit Log INSERT policy
-- Current: Only sales_manager/leads_manager can insert
-- Problem: Audit log entries are created alongside commissions by any user
-- Fix: Allow any authenticated user to insert audit log entries
-- ============================================
DROP POLICY IF EXISTS "managers_insert_audit_log" ON commission_audit_log;

CREATE POLICY "authenticated_insert_audit_log" ON commission_audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- FIX 3: Company Revenue INSERT policy
-- Current: Only leads_manager FOR ALL policy covers insert
-- Problem: Company revenue records are created alongside commissions
-- Fix: Add explicit INSERT policy for any authenticated user
-- ============================================
CREATE POLICY "authenticated_insert_company_revenue" ON company_revenue
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- FIX 4: Prevent duplicate commissions for the same deal+agent
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_commissions_deal_agent_unique
  ON commissions (deal_id, agent_id);

-- ============================================
-- FIX 5: Ensure only one default commission template
-- When a template is set as default, unset all others
-- ============================================
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE commission_templates
    SET is_default = false
    WHERE id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ensure_single_default_template
  BEFORE INSERT OR UPDATE ON commission_templates
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_template();
