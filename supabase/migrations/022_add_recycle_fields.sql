-- Add recycle functionality for leads
-- This allows recycling leads back to unassigned status

-- Add recycle tracking fields to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS recycled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS recycled_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS previous_assignee UUID REFERENCES profiles(id);

-- Create or get the Unassigned status (create if it doesn't exist)
DO $$
DECLARE
    unassigned_status_id UUID;
BEGIN
    -- Check if Unassigned status exists
    SELECT id INTO unassigned_status_id
    FROM statuses 
    WHERE LOWER(name) = 'unassigned'
    LIMIT 1;
    
    -- If it doesn't exist, create it
    IF unassigned_status_id IS NULL THEN
        INSERT INTO statuses (name, color, order_index, is_active)
        VALUES ('Unassigned', '#6B7280', 0, true)
        RETURNING id INTO unassigned_status_id;
    END IF;
END $$;

-- Create recycle_lead function
CREATE OR REPLACE FUNCTION recycle_lead(lead_id UUID)
RETURNS void AS $$
DECLARE
    unassigned_status_id UUID;
    current_assignee UUID;
BEGIN
    -- Get the Unassigned status ID
    SELECT id INTO unassigned_status_id
    FROM statuses 
    WHERE LOWER(name) = 'unassigned'
    LIMIT 1;
    
    -- Get current assignee before recycling
    SELECT assigned_to INTO current_assignee
    FROM leads
    WHERE id = lead_id;
    
    -- Update the lead to recycle it
    UPDATE leads 
    SET 
        assigned_to = NULL,
        status_id = unassigned_status_id,
        recycled_at = NOW(),
        recycled_by = auth.uid(),
        previous_assignee = current_assignee,
        updated_at = NOW()
    WHERE id = lead_id;
    
    -- Log the recycle action
    INSERT INTO activity_logs (lead_id, user_id, activity_type, summary, activity_date)
    VALUES (
        lead_id,
        auth.uid(),
        'assignment',
        'Lead recycled and unassigned',
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create bulk_recycle_leads function for multiple leads
CREATE OR REPLACE FUNCTION bulk_recycle_leads(lead_ids UUID[])
RETURNS void AS $$
DECLARE
    lead_id UUID;
BEGIN
    FOREACH lead_id IN ARRAY lead_ids
    LOOP
        PERFORM recycle_lead(lead_id);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on these functions
GRANT EXECUTE ON FUNCTION recycle_lead(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_recycle_leads(UUID[]) TO authenticated;

-- Add index for recycled leads queries
CREATE INDEX idx_leads_recycled_at ON leads(recycled_at) WHERE recycled_at IS NOT NULL;
CREATE INDEX idx_leads_previous_assignee ON leads(previous_assignee) WHERE previous_assignee IS NOT NULL;