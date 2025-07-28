-- Add source field to leads table for lead distribution
-- This allows sales team members to be assigned based on the source/publisher

ALTER TABLE leads ADD COLUMN source VARCHAR(255);

-- Add index for better performance on source field queries
CREATE INDEX idx_leads_source ON leads(source);

-- Update the view to include the source field
DROP VIEW IF EXISTS leads_with_author_name;

CREATE OR REPLACE VIEW leads_with_author_name AS
SELECT 
    l.*,
    COALESCE(l.author_name, CONCAT(l.first_name, ' ', l.last_name)) as computed_author_name
FROM leads l;

-- Add comment to document the source field
COMMENT ON COLUMN leads.source IS 'Source/publisher of the lead for distribution to appropriate sales team members'; 