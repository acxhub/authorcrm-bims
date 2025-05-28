-- Fix the UPDATE policy for sales agents to include proper with_check clause
-- This prevents RLS violations during lead creation when triggers update the record

-- Drop the current sales UPDATE policy
DROP POLICY IF EXISTS "Sales can update assigned leads" ON leads;

-- Create a new UPDATE policy with proper with_check clause
CREATE POLICY "Sales can update assigned leads" ON leads
    FOR UPDATE USING (
        assigned_to = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sales'
        )
    ) WITH CHECK (
        assigned_to = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sales'
        )
    ); 