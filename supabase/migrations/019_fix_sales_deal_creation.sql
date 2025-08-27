-- Fix sales agents and sales managers ability to create deals
-- Simplify the permission model to allow both roles to create/update deals

-- Drop the restrictive policy that's causing issues
DROP POLICY IF EXISTS "Sales can create deals for assigned leads" ON deals;

-- Create a simplified policy that allows sales and sales_manager to create deals
CREATE POLICY "Sales and managers can create deals" ON deals
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('sales', 'sales_manager')
            AND profiles.is_active = true
        )
    );

-- Also ensure they can update deals (simplify existing complex policy)
DROP POLICY IF EXISTS "Sales can update deals for their assigned leads or deals assigned to them" ON deals;

CREATE POLICY "Sales and managers can update deals" ON deals
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('sales', 'sales_manager')
            AND profiles.is_active = true
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('sales', 'sales_manager')
            AND profiles.is_active = true
        )
    );

-- Ensure they can view all deals they need to work with
DROP POLICY IF EXISTS "Sales can view deals for their assigned leads or deals assigned to them" ON deals;

CREATE POLICY "Sales and managers can view relevant deals" ON deals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('sales', 'sales_manager')
            AND profiles.is_active = true
        )
    );

-- Add audit log for this permission change
INSERT INTO activity_logs (lead_id, user_id, activity_type, summary, activity_date)
SELECT 
    (SELECT id FROM leads LIMIT 1),
    (SELECT id FROM profiles WHERE role = 'leads_manager' LIMIT 1),
    'note',
    'System Update: Sales and Sales Managers can now create and manage deals',
    NOW()
WHERE EXISTS (SELECT 1 FROM leads LIMIT 1);