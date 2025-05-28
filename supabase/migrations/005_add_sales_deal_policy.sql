-- Add policy for sales agents to create deals for their assigned leads
CREATE POLICY "Sales can create deals for assigned leads" ON deals
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = lead_id 
            AND leads.assigned_to = auth.uid()
        )
    ); 