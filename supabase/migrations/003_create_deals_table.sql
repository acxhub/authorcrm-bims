-- Create deals table
CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
    offer_title VARCHAR(255) NOT NULL,
    deal_value DECIMAL(12,2) DEFAULT 0,
    category VARCHAR(50) CHECK (category IN ('Publishing', 'Marketing', 'Event')),
    status_id UUID REFERENCES statuses(id) NOT NULL,
    assigned_to UUID REFERENCES profiles(id),
    notes TEXT,
    created_by UUID REFERENCES profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_deals_lead_id ON deals(lead_id);
CREATE INDEX idx_deals_status_id ON deals(status_id);
CREATE INDEX idx_deals_assigned_to ON deals(assigned_to);
CREATE INDEX idx_deals_created_by ON deals(created_by);
CREATE INDEX idx_deals_created_at ON deals(created_at);

-- Create updated_at trigger for deals
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on deals table
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- Deals policies (similar to leads policies)
CREATE POLICY "Leads managers can view all deals" ON deals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'leads_manager'
        )
    );

CREATE POLICY "Sales managers can view all deals" ON deals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sales_manager'
        )
    );

CREATE POLICY "Sales can view assigned deals" ON deals
    FOR SELECT USING (
        assigned_to = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('leads_manager', 'sales_manager')
        )
    );

CREATE POLICY "Leads managers can insert deals" ON deals
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'leads_manager'
        )
    );

CREATE POLICY "Sales managers can insert deals" ON deals
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sales_manager'
        )
    );

CREATE POLICY "Leads managers can update any deal" ON deals
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'leads_manager'
        )
    );

CREATE POLICY "Sales managers can update any deal" ON deals
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sales_manager'
        )
    );

CREATE POLICY "Sales can update assigned deals" ON deals
    FOR UPDATE USING (
        assigned_to = auth.uid()
    );

-- Migrate existing deal data from leads to deals table
INSERT INTO deals (lead_id, offer_title, deal_value, category, status_id, assigned_to, notes, created_by, created_at, updated_at)
SELECT 
    id as lead_id,
    COALESCE(offer_title, book_title) as offer_title,
    COALESCE(deal_value, 0) as deal_value,
    category,
    status_id,
    assigned_to,
    author_bio as notes,
    created_by,
    created_at,
    updated_at
FROM leads 
WHERE offer_title IS NOT NULL OR deal_value IS NOT NULL OR category IS NOT NULL;

-- Remove deal-specific fields from leads table (keep them for now to avoid breaking changes)
-- We'll remove them in a future migration after updating the application
-- ALTER TABLE leads DROP COLUMN IF EXISTS offer_title;
-- ALTER TABLE leads DROP COLUMN IF EXISTS deal_value;
-- ALTER TABLE leads DROP COLUMN IF EXISTS category; 