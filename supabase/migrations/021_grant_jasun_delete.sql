-- Grant delete leads permission to Jasun
-- We'll add a can_delete_leads column for granular permission control

-- Add can_delete_leads column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS can_delete_leads BOOLEAN DEFAULT false;

-- Grant permission to Jasun (search by name or email containing 'jasun')
UPDATE profiles 
SET can_delete_leads = true
WHERE LOWER(full_name) LIKE '%jasun%' 
   OR LOWER(email) LIKE '%jasun%';

-- Also ensure leads_manager role always has delete permission
UPDATE profiles 
SET can_delete_leads = true
WHERE role = 'leads_manager';

-- Create or replace the delete policy for leads to check this permission
DROP POLICY IF EXISTS "Users with delete permission can delete leads" ON leads;

CREATE POLICY "Users with delete permission can delete leads" ON leads
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_active = true
            AND (
                profiles.role = 'leads_manager' 
                OR profiles.can_delete_leads = true
            )
        )
    );

-- Log this permission grant
INSERT INTO activity_logs (lead_id, user_id, activity_type, summary, activity_date)
SELECT 
    (SELECT id FROM leads LIMIT 1),
    (SELECT id FROM profiles WHERE role = 'leads_manager' LIMIT 1),
    'note',
    'System Update: Delete permission granted to Jasun and users with can_delete_leads flag',
    NOW()
WHERE EXISTS (SELECT 1 FROM leads LIMIT 1);