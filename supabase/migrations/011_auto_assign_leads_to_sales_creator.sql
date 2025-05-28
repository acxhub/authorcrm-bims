-- Auto-assign leads to sales agents when they create them
-- Drop the current sales INSERT policy
DROP POLICY IF EXISTS "Sales can insert leads" ON leads;

-- Create a new policy that allows sales to insert leads but only if they assign to themselves
CREATE POLICY "Sales can insert leads assigned to themselves" ON leads
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sales'
        ) AND assigned_to = auth.uid()
    ); 