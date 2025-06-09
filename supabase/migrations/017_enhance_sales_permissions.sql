-- Enhance sales agent permissions to allow viewing and updating all leads
-- This addresses the requirement that sales agents should be able to update existing lead information

-- Drop restrictive policies
DROP POLICY IF EXISTS "Sales can only view their assigned leads" ON leads;
DROP POLICY IF EXISTS "Sales can update assigned leads" ON leads;
DROP POLICY IF EXISTS "Sales can update any lead" ON leads;

-- Allow sales agents to view all leads
CREATE POLICY "Sales can view all leads" ON leads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sales'
            AND profiles.is_active = true
        )
    );

-- Allow sales agents to update any lead
CREATE POLICY "Sales can update any lead" ON leads
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sales'
            AND profiles.is_active = true
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sales'
            AND profiles.is_active = true
        )
    ); 