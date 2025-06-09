-- Allow sales agents to create leads and automatically assign them to the creator
-- This ensures sales agents can build their own pipeline

-- First, ensure sales agents can create leads
-- Drop any existing restrictive INSERT policies for sales
DROP POLICY IF EXISTS "Sales can insert leads" ON leads;
DROP POLICY IF EXISTS "Sales can insert leads assigned to themselves" ON leads;
DROP POLICY IF EXISTS "Sales can create deals for assigned leads" ON leads;

-- Create a comprehensive INSERT policy for sales agents
CREATE POLICY "Sales can create leads" ON leads
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sales'
            AND profiles.is_active = true
        )
    );

-- Create a trigger function to auto-assign leads to sales agents who create them
CREATE OR REPLACE FUNCTION auto_assign_lead_to_creator()
RETURNS TRIGGER AS $$
DECLARE
    creator_role user_role;
BEGIN
    -- Get the role of the user who created the lead
    SELECT role INTO creator_role 
    FROM profiles 
    WHERE id = NEW.created_by;
    
    -- If the creator is a sales agent and no assignment is set, assign to creator
    IF creator_role = 'sales' AND NEW.assigned_to IS NULL THEN
        NEW.assigned_to = NEW.created_by;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger to run before INSERT on leads
DROP TRIGGER IF EXISTS auto_assign_lead_trigger ON leads;
CREATE TRIGGER auto_assign_lead_trigger
    BEFORE INSERT ON leads
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_lead_to_creator(); 