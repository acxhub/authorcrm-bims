-- Reminders/Todo System - Database Migration
-- Migration: 025_create_reminders_table
-- Date: February 2026

-- ============================================
-- TABLE: reminders
-- ============================================
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  notes TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  due_date DATE,
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_lead_id ON reminders(lead_id);
CREATE INDEX idx_reminders_due_date ON reminders(due_date);
CREATE INDEX idx_reminders_user_completed ON reminders(user_id, is_completed);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Users can view their own reminders
CREATE POLICY "users_view_own_reminders" ON reminders
  FOR SELECT USING (user_id = auth.uid());

-- Users can create their own reminders
CREATE POLICY "users_create_own_reminders" ON reminders
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own reminders
CREATE POLICY "users_update_own_reminders" ON reminders
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own reminders
CREATE POLICY "users_delete_own_reminders" ON reminders
  FOR DELETE USING (user_id = auth.uid());

-- Managers can view all reminders (for oversight)
CREATE POLICY "managers_view_all_reminders" ON reminders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('sales_manager', 'leads_manager')
    )
  );

-- ============================================
-- UPDATED_AT TRIGGER (reuses existing function from migration 023)
-- ============================================
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
