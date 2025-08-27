# Simplified Implementation Plan - Author CRM Updates

## Overview
This document provides a simplified, practical implementation plan for 7 system requirements. Focus is on minimal changes that deliver maximum value.

## Priority Order (Based on Ease & Impact)

### Phase 1: Quick Wins (Day 1-2)
1. **Requirement 2**: Add Publisher Field to Leads
2. **Requirement 3**: Grant Delete Permission to Jasun  
3. **Requirement 1**: Fix Sales Agent/Manager Deal Creation

### Phase 2: Core Features (Day 3-4)
4. **Requirement 7**: Recycle Function for Leads
5. **Requirement 6**: Pipeline Filters

### Phase 3: Dashboards (Day 5-6)
6. **Requirement 5**: Sold Dashboard
7. **Requirement 4**: Sales Gamification

---

## Requirement 1: Fix Sales Agent/Manager Deal Creation

### Current Issue
Sales agents and managers cannot create deals due to RLS policies.

### Simple Fix
**Migration File**: `019_fix_sales_deal_creation.sql`
```sql
-- Drop conflicting policy
DROP POLICY IF EXISTS "Sales can create deals for assigned leads" ON deals;

-- Simplify: Allow sales and sales_manager to create deals
CREATE POLICY "Sales and managers can create deals" ON deals
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE role IN ('sales', 'sales_manager')
            AND is_active = true
        )
    );
```

### Frontend Changes
- No changes needed - CreateDealModal already exists
- Verify button is shown for sales/sales_manager roles

---

## Requirement 2: Add Publisher Field to Leads

### Database
The `source` field already exists (migration 018). We just need to:
1. Rename it to `publisher` for clarity
2. Update the UI to display it

### Migration File: `020_rename_source_to_publisher.sql`
```sql
-- Rename source to publisher
ALTER TABLE leads RENAME COLUMN source TO publisher;

-- Update index
DROP INDEX IF EXISTS idx_leads_source;
CREATE INDEX idx_leads_publisher ON leads(publisher);

-- Update comment
COMMENT ON COLUMN leads.publisher IS 'Publisher information for the lead';
```

### Frontend Changes
1. Update types in `src/integrations/supabase/types.ts`
2. Add publisher column to `src/components/leads/LeadsList.tsx`
3. Add publisher field to `src/components/leads/LeadForm.tsx`

---

## Requirement 3: Grant Delete Permission to Jasun

### Simple Approach
Add Jasun to leads_manager role (simplest, most maintainable)

### Migration File: `021_grant_jasun_delete.sql`
```sql
-- Find Jasun's user and update role
UPDATE profiles 
SET role = 'leads_manager'
WHERE full_name ILIKE '%jasun%' 
   OR email ILIKE '%jasun%';

-- If Jasun doesn't exist, document the manual step
-- Admin can update via User Management page
```

### Alternative: Add delete permission flag
```sql
-- Add can_delete_leads column to profiles
ALTER TABLE profiles 
ADD COLUMN can_delete_leads BOOLEAN DEFAULT false;

-- Grant to Jasun
UPDATE profiles 
SET can_delete_leads = true
WHERE full_name ILIKE '%jasun%';
```

---

## Requirement 4: Sales Gamification Dashboard

### Simple Implementation
Create a new page showing leaderboard using existing data.

### New Files
1. `src/pages/Gamification.tsx` - Main dashboard
2. `src/components/gamification/Leaderboard.tsx` - Top performers
3. `src/hooks/useGamification.ts` - Data fetching

### Data Query (using existing tables)
```typescript
// Count deals won by user this month
const getLeaderboard = async () => {
  const { data } = await supabase
    .from('deals')
    .select(`
      created_by,
      profiles!created_by(full_name),
      deal_value
    `)
    .eq('status_id', 'won_status_id')
    .gte('created_at', startOfMonth);
    
  // Group and sum by user
  return aggregateByUser(data);
};
```

### Route Addition
```typescript
// In App.tsx
<Route path="/gamification" element={
  <ProtectedRoute>
    <Gamification />
  </ProtectedRoute>
} />
```

---

## Requirement 5: Sold Dashboard

### Simple Implementation
Reuse existing Dashboard components with filtered data.

### New Component
`src/pages/SoldDashboard.tsx` - Copy Index.tsx and filter for sold deals

### Key Changes
```typescript
// Filter for sold deals only
const { data: soldDeals } = useDeals({
  filters: {
    status: 'sold' // or specific status_id
  }
});

// Display using existing DashboardMetrics component
<DashboardMetrics 
  deals={soldDeals}
  title="Sold Deals Dashboard"
/>
```

---

## Requirement 6: Pipeline Filters in Sold Dashboard

### Simple Approach
Add filter state to SoldDashboard using existing filter patterns.

### Implementation
```typescript
// In SoldDashboard.tsx
const [filters, setFilters] = useState({
  dateRange: null,
  stage: null,
  assignedTo: null,
  minValue: null,
  maxValue: null
});

// Reuse existing filter UI components
<div className="flex gap-2 mb-4">
  <DateRangePicker onChange={(range) => setFilters({...filters, dateRange: range})} />
  <Select onValueChange={(stage) => setFilters({...filters, stage})}>
    {/* Pipeline stages */}
  </Select>
  <UserSelect onChange={(user) => setFilters({...filters, assignedTo: user})} />
</div>
```

---

## Requirement 7: Recycle Function for Leads

### Database Changes
Migration File: `022_add_recycle_fields.sql`
```sql
-- Add recycle tracking to leads
ALTER TABLE leads 
ADD COLUMN recycled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN recycled_by UUID REFERENCES profiles(id),
ADD COLUMN previous_assignee UUID REFERENCES profiles(id);

-- Create recycle function
CREATE OR REPLACE FUNCTION recycle_lead(lead_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE leads 
  SET 
    assigned_to = NULL,
    status_id = (SELECT id FROM statuses WHERE name = 'Unassigned' LIMIT 1),
    recycled_at = NOW(),
    recycled_by = auth.uid(),
    previous_assignee = assigned_to
  WHERE id = lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Frontend Implementation
1. Add Recycle button to `LeadsList.tsx`
```typescript
const handleRecycle = async (leadId: string) => {
  const { error } = await supabase.rpc('recycle_lead', { lead_id: leadId });
  if (!error) {
    toast.success("Lead recycled successfully");
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  }
};
```

2. Add bulk recycle to `BulkLeadActions.tsx`
```typescript
const handleBulkRecycle = async (leadIds: string[]) => {
  const promises = leadIds.map(id => 
    supabase.rpc('recycle_lead', { lead_id: id })
  );
  await Promise.all(promises);
  toast.success(`${leadIds.length} leads recycled`);
};
```

---

## Testing Checklist

### Requirement 1: Deal Creation
- [ ] Login as sales user
- [ ] Navigate to leads
- [ ] Click "Add Deal" - should work
- [ ] Verify deal appears in pipeline

### Requirement 2: Publisher Field
- [ ] Publisher shows in leads list
- [ ] Can add/edit publisher in lead form
- [ ] Can filter by publisher

### Requirement 3: Jasun Delete
- [ ] Login as Jasun
- [ ] Can see delete button on leads
- [ ] Can successfully delete a lead

### Requirement 4: Gamification
- [ ] Navigate to /gamification
- [ ] See leaderboard with correct data
- [ ] Updates when new deals are won

### Requirement 5: Sold Dashboard
- [ ] Navigate to sold dashboard
- [ ] Shows only sold deals
- [ ] Metrics are accurate

### Requirement 6: Filters
- [ ] All filters work on sold dashboard
- [ ] Results update correctly
- [ ] Can combine multiple filters

### Requirement 7: Recycle
- [ ] Can recycle individual lead
- [ ] Can bulk recycle multiple leads
- [ ] Leads become unassigned
- [ ] Previous assignee is tracked

---

## Deployment Steps

1. **Database Migrations**
   - Run migrations 019-022 in order
   - Verify all policies are active

2. **Frontend Deployment**
   - Build and test locally first
   - Deploy to staging
   - Test all features
   - Deploy to production

3. **Post-Deployment**
   - Monitor error logs
   - Gather user feedback
   - Make quick adjustments if needed

---

## Risk Mitigation

1. **Backup Before Changes**
   - Export current data
   - Save current RLS policies

2. **Test in Staging First**
   - Use staging Supabase project
   - Test with production-like data

3. **Gradual Rollout**
   - Deploy one feature at a time
   - Monitor for issues before next feature

4. **Quick Rollback Plan**
   - Keep previous version ready
   - Document rollback SQL for each migration