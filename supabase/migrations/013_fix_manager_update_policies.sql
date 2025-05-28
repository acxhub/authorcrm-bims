-- Fix UPDATE policies for managers to include proper with_check clauses
-- This ensures consistency and prevents potential RLS issues

-- Fix Leads Manager UPDATE policy
DROP POLICY IF EXISTS "Leads managers can update any lead" ON leads;
CREATE POLICY "Leads managers can update any lead" ON leads
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'leads_manager'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'leads_manager'
        )
    );

-- Fix Sales Manager UPDATE policy  
DROP POLICY IF EXISTS "Sales managers can update any lead" ON leads;
CREATE POLICY "Sales managers can update any lead" ON leads
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sales_manager'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sales_manager'
        )
    ); 