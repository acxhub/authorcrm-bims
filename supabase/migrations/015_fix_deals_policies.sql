-- Fix deals table policies to ensure Lead Managers and Sales Managers can access all deals
-- and add missing DELETE policies

-- First, drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Leads managers can view all deals" ON deals;
DROP POLICY IF EXISTS "Sales managers can view all deals" ON deals;
DROP POLICY IF EXISTS "Sales can view assigned deals" ON deals;

-- Recreate SELECT policies with better logic
CREATE POLICY "Leads managers can view all deals" ON deals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'leads_manager'
            AND profiles.is_active = true
        )
    );

CREATE POLICY "Sales managers can view all deals" ON deals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sales_manager'
            AND profiles.is_active = true
        )
    );

CREATE POLICY "Sales can view deals for their assigned leads or deals assigned to them" ON deals
    FOR SELECT USING (
        -- Sales can see deals assigned directly to them
        assigned_to = auth.uid() OR
        -- Sales can see deals for leads assigned to them
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = deals.lead_id 
            AND leads.assigned_to = auth.uid()
        ) OR
        -- Sales can see deals they created
        created_by = auth.uid()
    );

-- Add missing DELETE policies
CREATE POLICY "Leads managers can delete any deal" ON deals
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'leads_manager'
            AND profiles.is_active = true
        )
    );

CREATE POLICY "Sales managers can delete any deal" ON deals
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sales_manager'
            AND profiles.is_active = true
        )
    );

CREATE POLICY "Sales can delete deals they created or for their assigned leads" ON deals
    FOR DELETE USING (
        -- Sales can delete deals they created
        created_by = auth.uid() OR
        -- Sales can delete deals for leads assigned to them
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = deals.lead_id 
            AND leads.assigned_to = auth.uid()
        )
    );

-- Also ensure INSERT policies allow creation when appropriate
-- These should already exist, but let's make sure they have the is_active check

-- Drop and recreate INSERT policies with is_active check
DROP POLICY IF EXISTS "Leads managers can insert deals" ON deals;
DROP POLICY IF EXISTS "Sales managers can insert deals" ON deals;
DROP POLICY IF EXISTS "Sales can create deals for assigned leads" ON deals;

CREATE POLICY "Leads managers can insert deals" ON deals
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'leads_manager'
            AND profiles.is_active = true
        )
    );

CREATE POLICY "Sales managers can insert deals" ON deals
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sales_manager'
            AND profiles.is_active = true
        )
    );

CREATE POLICY "Sales can create deals for assigned leads" ON deals
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = lead_id 
            AND (leads.assigned_to = auth.uid() OR leads.created_by = auth.uid())
        )
    );

-- Update UPDATE policies to include is_active check
DROP POLICY IF EXISTS "Leads managers can update any deal" ON deals;
DROP POLICY IF EXISTS "Sales managers can update any deal" ON deals;
DROP POLICY IF EXISTS "Sales can update assigned deals" ON deals;

CREATE POLICY "Leads managers can update any deal" ON deals
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'leads_manager'
            AND profiles.is_active = true
        )
    );

CREATE POLICY "Sales managers can update any deal" ON deals
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sales_manager'
            AND profiles.is_active = true
        )
    );

CREATE POLICY "Sales can update deals for their assigned leads or deals assigned to them" ON deals
    FOR UPDATE USING (
        -- Sales can update deals assigned directly to them
        assigned_to = auth.uid() OR
        -- Sales can update deals for leads assigned to them
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = deals.lead_id 
            AND leads.assigned_to = auth.uid()
        ) OR
        -- Sales can update deals they created
        created_by = auth.uid()
    ); 