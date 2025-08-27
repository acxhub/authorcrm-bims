-- Handle publisher field - it might already exist or we need to migrate from source
-- Check if publisher already exists, if not check for source field and rename it

DO $$
BEGIN
    -- Check if publisher column already exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'publisher') THEN
        
        -- Check if source column exists to rename
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'source') THEN
            -- Rename source to publisher
            ALTER TABLE leads RENAME COLUMN source TO publisher;
        ELSE
            -- Neither exists, create publisher column
            ALTER TABLE leads ADD COLUMN publisher VARCHAR(255);
        END IF;
    ELSE
        -- Publisher already exists, check if we need to migrate data from source
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'source') THEN
            -- Both exist, migrate data from source to publisher if publisher is empty
            UPDATE leads 
            SET publisher = source 
            WHERE publisher IS NULL AND source IS NOT NULL;
            
            -- Drop the source column as it's no longer needed
            ALTER TABLE leads DROP COLUMN source;
        END IF;
    END IF;
END $$;

-- Drop old index if it exists and create new one
DROP INDEX IF EXISTS idx_leads_source;
DROP INDEX IF EXISTS idx_leads_publisher;
CREATE INDEX IF NOT EXISTS idx_leads_publisher ON leads(publisher);

-- Update the comment
COMMENT ON COLUMN leads.publisher IS 'Publisher information for the lead';

-- Update the view to include publisher field
DROP VIEW IF EXISTS leads_with_author_name;

CREATE OR REPLACE VIEW leads_with_author_name AS
SELECT 
    l.*,
    COALESCE(l.author_name, CONCAT(l.first_name, ' ', l.last_name)) as computed_author_name
FROM leads l;