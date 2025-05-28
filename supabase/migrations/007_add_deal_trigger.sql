-- Get or create the 'New Deal' status
INSERT INTO statuses (name, color, order_index)
SELECT 'New Deal', '#6366F1', (SELECT MAX(order_index) + 1 FROM statuses)
WHERE NOT EXISTS (SELECT 1 FROM statuses WHERE name = 'New Deal');

-- Create function to update lead status
CREATE OR REPLACE FUNCTION update_lead_status_on_deal()
RETURNS TRIGGER AS $$
DECLARE
    new_deal_status_id UUID;
BEGIN
    -- Get the 'New Deal' status ID
    SELECT id INTO new_deal_status_id FROM statuses WHERE name = 'New Deal';

    -- Update the lead status to 'New Deal'
    UPDATE leads
    SET status_id = new_deal_status_id
    WHERE id = NEW.lead_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_lead_status_on_deal_insert ON deals;
CREATE TRIGGER update_lead_status_on_deal_insert
    AFTER INSERT ON deals
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_status_on_deal(); 