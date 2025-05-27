-- Insert default statuses for the lead pipeline
INSERT INTO statuses (name, color, order_index) VALUES
('New Lead', '#10B981', 1),
('Contacted', '#3B82F6', 2),
('Qualified', '#8B5CF6', 3),
('Proposal Sent', '#F59E0B', 4),
('Negotiating', '#EF4444', 5),
('Closed Won', '#059669', 6),
('Closed Lost', '#6B7280', 7),
('Dead Lead', '#374151', 8);

-- Insert default tags for lead categorization
INSERT INTO tags (name, color, description) VALUES
('Fiction', '#EF4444', 'Fiction books and novels'),
('Non-Fiction', '#3B82F6', 'Non-fiction books'),
('Self-Help', '#10B981', 'Self-help and personal development'),
('Business', '#F59E0B', 'Business and entrepreneurship'),
('Romance', '#EC4899', 'Romance novels'),
('Mystery', '#8B5CF6', 'Mystery and thriller books'),
('Fantasy', '#06B6D4', 'Fantasy and sci-fi books'),
('Biography', '#84CC16', 'Biographies and memoirs'),
('Health', '#F97316', 'Health and wellness books'),
('Technology', '#6366F1', 'Technology and programming books'),
('Hot Lead', '#DC2626', 'High priority leads'),
('Cold Lead', '#9CA3AF', 'Low priority leads'),
('Referral', '#059669', 'Leads from referrals'),
('Website', '#7C3AED', 'Leads from website'),
('Social Media', '#DB2777', 'Leads from social media');

-- Set up Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Leads policies
CREATE POLICY "Leads managers can view all leads" ON leads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'leads_manager'
        )
    );

CREATE POLICY "Sales managers can view all leads" ON leads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sales_manager'
        )
    );

CREATE POLICY "Sales can view assigned leads" ON leads
    FOR SELECT USING (
        assigned_to = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('leads_manager', 'sales_manager')
        )
    );

CREATE POLICY "Leads managers can insert leads" ON leads
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'leads_manager'
        )
    );

CREATE POLICY "Sales managers can insert leads" ON leads
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sales_manager'
        )
    );

CREATE POLICY "Leads managers can update any lead" ON leads
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'leads_manager'
        )
    );

CREATE POLICY "Sales managers can update any lead" ON leads
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sales_manager'
        )
    );

CREATE POLICY "Sales can update assigned leads" ON leads
    FOR UPDATE USING (
        assigned_to = auth.uid()
    );

-- Statuses policies (read-only for most users)
CREATE POLICY "All authenticated users can view statuses" ON statuses
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only leads managers can modify statuses" ON statuses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'leads_manager'
        )
    );

-- Tags policies
CREATE POLICY "All authenticated users can view tags" ON tags
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Managers can modify tags" ON tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('leads_manager', 'sales_manager')
        )
    );

-- Lead tags policies
CREATE POLICY "Users can view lead tags for accessible leads" ON lead_tags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = lead_tags.lead_id
            AND (
                leads.assigned_to = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role IN ('leads_manager', 'sales_manager')
                )
            )
        )
    );

CREATE POLICY "Users can modify lead tags for accessible leads" ON lead_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = lead_tags.lead_id
            AND (
                leads.assigned_to = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role IN ('leads_manager', 'sales_manager')
                )
            )
        )
    );

-- Activity logs policies
CREATE POLICY "Users can view activity logs for accessible leads" ON activity_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = activity_logs.lead_id
            AND (
                leads.assigned_to = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role IN ('leads_manager', 'sales_manager')
                )
            )
        )
    );

CREATE POLICY "Users can create activity logs for accessible leads" ON activity_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = activity_logs.lead_id
            AND (
                leads.assigned_to = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role IN ('leads_manager', 'sales_manager')
                )
            )
        )
    );

-- Comments policies
CREATE POLICY "Users can view comments for accessible leads" ON comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = comments.lead_id
            AND (
                leads.assigned_to = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role IN ('leads_manager', 'sales_manager')
                )
            )
        )
    );

CREATE POLICY "Users can create comments for accessible leads" ON comments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = comments.lead_id
            AND (
                leads.assigned_to = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role IN ('leads_manager', 'sales_manager')
                )
            )
        )
    );

CREATE POLICY "Users can update their own comments" ON comments
    FOR UPDATE USING (user_id = auth.uid()); 