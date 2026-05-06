-- Distinguish lead record kind (Lead vs Sold Lead) from pipeline status (status_id).

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS lead_record_type text NOT NULL DEFAULT 'lead'
CHECK (lead_record_type IN ('lead', 'sold_lead'));

COMMENT ON COLUMN leads.lead_record_type IS 'CRM record classification: active lead vs sold-lead record. Separate from pipeline status_id.';

DROP VIEW IF EXISTS leads_with_author_name;
CREATE VIEW leads_with_author_name AS
SELECT
  leads.*,
  get_author_name(leads.first_name, leads.last_name) AS computed_author_name
FROM leads
WHERE leads.deleted_at IS NULL;
