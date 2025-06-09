# Deals Policy Issues & Solutions

## Summary of Issues Found:

### Issue 1: Missing DELETE policies on deals table
- Lead Managers and Sales Managers cannot delete deals because there are no DELETE policies defined
- The original migration in `003_create_deals_table.sql` only includes SELECT, INSERT, and UPDATE policies

### Issue 2: Potential visibility issues for Lead/Sales Managers
- Current SELECT policies may not be properly filtering based on user roles
- Need to ensure `is_active = true` check is included for all role-based policies

## Root Cause Analysis:

1. **Missing DELETE Policies**: The deals table was created with comprehensive SELECT, INSERT, and UPDATE policies, but DELETE policies were completely omitted.

2. **Policy Logic Issues**: Some existing policies may not properly check for `is_active = true` which could cause permission issues for inactive users.

## Solutions Required:

### Step 1: Apply Missing DELETE Policies

Run the following SQL in Supabase SQL Editor:

```sql
-- Add missing DELETE policies for deals table
CREATE POLICY "Leads managers can delete any deal" ON deals
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'leads_manager'
            AND profiles.is_active = true
        )
    );

CREATE POLICY "Sales managers can delete any deal" ON deals
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'sales_manager'
            AND profiles.is_active = true
        )
    );

CREATE POLICY "Sales can delete deals they created or for their assigned leads" ON deals
    FOR DELETE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = deals.lead_id 
            AND leads.assigned_to = auth.uid()
        )
    );
```

### Step 2: Verify and Fix Existing Policies

Check current policies and ensure they include `is_active = true`:

```sql
-- Check current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'deals' 
ORDER BY policyname;
```

### Step 3: Test User Roles

Verify users have correct roles:

```sql
-- Check user roles
SELECT 
    id,
    email,
    role,
    is_active,
    created_at
FROM profiles 
WHERE role IN ('leads_manager', 'sales_manager')
ORDER BY role, email;
```

### Step 4: Test Deals Visibility

After applying fixes, test that:
- Lead Managers can see all deals
- Sales Managers can see all deals  
- Sales can see deals for their assigned leads
- All roles can delete deals according to their permissions

## Expected Behavior After Fix:

| Role | View Deals | Create Deals | Update Deals | Delete Deals |
|------|------------|--------------|--------------|--------------|
| **Leads Manager** | All deals | ✅ Any | ✅ Any | ✅ Any |
| **Sales Manager** | All deals | ✅ Any | ✅ Any | ✅ Any |
| **Sales** | Assigned leads + Created deals | ✅ For assigned leads | ✅ Assigned deals + Created | ✅ Created + Assigned leads |

## Files Created/Modified:

- `supabase/migrations/015_fix_deals_policies.sql` - Complete policy fix migration
- This documentation file

## Next Steps:

1. Apply the SQL fixes manually in Supabase Dashboard
2. Test deal visibility and deletion for each user role
3. Verify that Lead Managers and Sales Managers can now see all deals
4. Confirm that deal deletion works for all appropriate roles 