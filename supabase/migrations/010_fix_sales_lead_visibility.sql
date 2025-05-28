-- Fix sales agent lead visibility - they should only see assigned leads
-- Drop the problematic policy that allows sales to see all leads
DROP POLICY IF EXISTS "Sales can view assigned leads" ON leads;

-- Create a new, more restrictive policy for sales agents
CREATE POLICY "Sales can only view their assigned leads" ON leads
    FOR SELECT USING (
        assigned_to = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sales'
        )
    ); 