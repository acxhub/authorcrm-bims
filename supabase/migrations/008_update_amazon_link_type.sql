-- Drop the view first
DROP VIEW IF EXISTS leads_with_author_name;

-- Change amazon_link type from VARCHAR(500) to TEXT
ALTER TABLE leads ALTER COLUMN amazon_link TYPE TEXT;

-- Recreate the view
CREATE OR REPLACE VIEW leads_with_author_name AS
SELECT 
    l.*,
    COALESCE(l.author_name, CONCAT(l.first_name, ' ', l.last_name)) as display_name
FROM leads l; 