-- Fix the INSERT policy for sales agents to be more flexible
-- Allow sales agents to create leads that are either assigned to themselves or unassigned (null)
-- This handles cases where the frontend might not set assigned_to correctly

-- Drop the current restrictive policy
DROP POLICY IF EXISTS "Sales can insert leads assigned to themselves" ON leads;

-- Create a more flexible policy for sales agents
CREATE POLICY "Sales can insert leads" ON leads
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sales'
        ) AND (
            assigned_to = auth.uid() OR assigned_to IS NULL
        )
    );

-- Also ensure that if assigned_to is NULL, we can update it later via trigger
-- Create a trigger to auto-assign leads to sales agents if not assigned
CREATE OR REPLACE FUNCTION auto_assign_lead_to_sales()
RETURNS TRIGGER AS $$
BEGIN
    -- If the lead is created by a sales agent and not assigned, assign it to them
    IF NEW.assigned_to IS NULL AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = NEW.created_by 
        AND profiles.role = 'sales'
    ) THEN
        NEW.assigned_to := NEW.created_by;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_assign_lead_to_sales ON leads;
CREATE TRIGGER trigger_auto_assign_lead_to_sales
    BEFORE INSERT ON leads
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_lead_to_sales(); 