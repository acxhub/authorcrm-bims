# System Updates and Implementation Plan

## Overview
This document outlines the required system updates and provides detailed implementation plans for each requirement. These updates focus on improving user permissions, data visibility, and system functionality.

---

## 1. Sales Agent and Sales Manager Deal Creation

### Current Issue
Sales agents and Sales managers cannot add new deals in the system.

### Proposed Solution
Simplify the permission approach to allow both roles to update and add deals based on lead access permissions.

### Implementation Plan

#### Step 1: Permission Model Review
- Audit current permission structure for Sales Agents and Sales Managers
- Identify the blocking constraints preventing deal creation
- Document current lead-to-deal relationship permissions

#### Step 2: Permission Logic Update
```
IF user_role IN ('Sales Agent', 'Sales Manager') 
AND user_has_access_to_lead(lead_id)
THEN allow_deal_operations = TRUE
```

#### Step 3: Database Changes
- Update role_permissions table to include:
  - `can_create_deals` = TRUE for Sales Agent role
  - `can_create_deals` = TRUE for Sales Manager role
- Add conditional check linking deal creation to lead access

#### Step 4: API Endpoint Updates
- Modify `/api/deals/create` endpoint to check:
  1. User role (Sales Agent/Manager)
  2. Lead ownership/access rights
  3. Allow operation if both conditions are met

#### Step 5: UI Changes
- Enable "Add Deal" button for Sales Agents and Sales Managers
- Add validation on frontend to check lead access before showing deal creation option

#### Testing Requirements
- Test deal creation with different lead ownership scenarios
- Verify Sales Agents can only create deals for their assigned leads
- Confirm Sales Managers can create deals for team leads

---

## 2. Add Publisher Field in Leads View

### Requirement
Display publisher information in the Leads list view for better visibility and tracking.

### Implementation Plan

#### Step 1: Database Verification
- Confirm `publisher` field exists in leads table
- If not, add migration:
  ```sql
  ALTER TABLE leads ADD COLUMN publisher VARCHAR(255);
  ```

#### Step 2: Backend API Update
- Modify leads GET endpoint to include publisher field:
  ```javascript
  const leadsQuery = `
    SELECT id, name, email, phone, status, 
           assigned_to, publisher, created_at 
    FROM leads
  `;
  ```

#### Step 3: Frontend Grid Configuration
- Add publisher column to leads table component:
  ```javascript
  columns: [
    { field: 'name', header: 'Lead Name' },
    { field: 'email', header: 'Email' },
    { field: 'publisher', header: 'Publisher' }, // New column
    // ... other columns
  ]
  ```

#### Step 4: Add Filter/Sort Capability
- Enable sorting by publisher
- Add publisher to searchable fields
- Include in advanced filter options

#### Testing Requirements
- Verify publisher data displays correctly
- Test sorting and filtering by publisher
- Ensure mobile responsive view handles new column

---

## 3. Grant Delete Leads Permission to Jasun

### Requirement
Add "Delete Leads" permission specifically for user Jasun through Admin or Leads Team role.

### Implementation Plan

#### Option A: Individual Permission Grant
```sql
-- Direct permission assignment
INSERT INTO user_permissions (user_id, permission_name, granted_by, granted_at)
SELECT u.id, 'delete_leads', 'system_admin', NOW()
FROM users u WHERE u.username = 'jasun';
```

#### Option B: Role-Based Assignment
```sql
-- Add Jasun to Leads Team role with delete permission
UPDATE user_roles 
SET role = 'Leads Team Admin'
WHERE user_id = (SELECT id FROM users WHERE username = 'jasun');

-- Ensure Leads Team Admin role has delete permission
INSERT INTO role_permissions (role_name, permission)
VALUES ('Leads Team Admin', 'delete_leads')
ON CONFLICT DO NOTHING;
```

#### Implementation Steps
1. Identify Jasun's user ID in the system
2. Determine preferred approach (individual vs role-based)
3. Execute permission grant
4. Add audit log entry for permission change
5. Notify Jasun of new permissions
6. Update UI to show delete button for authorized users

#### Security Considerations
- Add confirmation dialog for lead deletion
- Implement soft delete initially (mark as deleted vs permanent removal)
- Log all delete operations with timestamp and user ID

---

## 4. Sales Gamification View (View for All)

### Requirement
Create a gamification dashboard visible to all users showing sales performance metrics.

### Implementation Plan

#### Step 1: Dashboard Design
- **Metrics to Display:**
  - Top performers leaderboard
  - Monthly/Weekly/Daily sales achievements
  - Achievement badges/milestones
  - Team vs Individual performance
  - Progress bars for targets

#### Step 2: Backend Development
```javascript
// API endpoint for gamification metrics
GET /api/gamification/dashboard
Response: {
  leaderboard: [...],
  achievements: [...],
  team_performance: {...},
  personal_stats: {...}
}
```

#### Step 3: Frontend Component Structure
```
<GamificationDashboard>
  <LeaderboardWidget />
  <AchievementBadges />
  <PerformanceChart />
  <TeamComparison />
</GamificationDashboard>
```

#### Step 4: Permission Configuration
- Set view permission to "all_users"
- Implement data filtering based on user role:
  - Agents see their team's data
  - Managers see all teams
  - Admins see everything

#### Step 5: Real-time Updates
- Implement WebSocket connection for live updates
- Cache mechanism for performance optimization
- Refresh interval: 5 minutes for non-critical data

---

## 5. Sold Dashboard (View for All)

### Requirement
Create a dashboard showing sold deals/leads accessible to all users.

### Implementation Plan

#### Step 1: Dashboard Components
- **Key Widgets:**
  - Total sales count and value
  - Sales by time period (daily/weekly/monthly)
  - Sales by product/service
  - Conversion rates
  - Sales pipeline visualization

#### Step 2: Data Access Layer
```sql
CREATE VIEW sold_deals_summary AS
SELECT 
  COUNT(*) as total_sold,
  SUM(deal_value) as total_value,
  DATE(sold_date) as sale_date,
  product_type,
  sales_agent
FROM deals
WHERE status = 'sold'
GROUP BY DATE(sold_date), product_type, sales_agent;
```

#### Step 3: API Endpoints
```
GET /api/dashboard/sold - Main dashboard data
GET /api/dashboard/sold/filters - Available filter options
GET /api/dashboard/sold/export - Export functionality
```

#### Step 4: Frontend Implementation
- Use existing dashboard framework
- Implement responsive grid layout
- Add interactive charts (Chart.js or similar)
- Include export to PDF/Excel functionality

---

## 6. Filter on Pipeline in Sold Dashboard

### Requirement
Add pipeline filtering capability to the Sold Dashboard with same filters as Leads view.

### Implementation Plan

#### Step 1: Identify Existing Lead Filters
Common lead filters to replicate:
- Date range
- Status
- Assigned user
- Source
- Tags
- Custom fields

#### Step 2: Pipeline-Specific Filters
Add additional pipeline filters:
- Pipeline stage
- Deal value range
- Product/Service type
- Close probability
- Expected close date

#### Step 3: Filter Component Implementation
```javascript
const PipelineFilters = {
  dateRange: { start: Date, end: Date },
  pipeline: ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed'],
  dealValue: { min: Number, max: Number },
  assignedTo: [userId],
  tags: [tagIds],
  // ... other filters
}
```

#### Step 4: Backend Filter Logic
```sql
SELECT * FROM pipeline_deals
WHERE 1=1
  AND stage IN (?)
  AND deal_value BETWEEN ? AND ?
  AND assigned_to IN (?)
  AND DATE(created_at) BETWEEN ? AND ?
-- Dynamic WHERE clause based on selected filters
```

#### Step 5: UI Integration
- Add filter bar above pipeline view
- Implement saved filter presets
- Add quick filter buttons for common selections
- Include filter reset functionality

---

## 7. Recycle Function for Leads

### Requirement
Implement recycle functionality that changes recycled leads' status to "Unassigned".

### Implementation Plan

#### Step 1: Database Schema Update
```sql
-- Add recycle tracking
ALTER TABLE leads 
ADD COLUMN recycled_at TIMESTAMP,
ADD COLUMN recycled_by INT REFERENCES users(id),
ADD COLUMN previous_assignee INT REFERENCES users(id);
```

#### Step 2: Recycle Logic Implementation
```javascript
async function recycleLead(leadId, userId) {
  // Store previous state
  const lead = await getLeadById(leadId);
  
  // Update lead
  await updateLead(leadId, {
    status: 'Unassigned',
    assigned_to: null,
    recycled_at: new Date(),
    recycled_by: userId,
    previous_assignee: lead.assigned_to
  });
  
  // Log the action
  await createAuditLog({
    action: 'lead_recycled',
    entity_id: leadId,
    user_id: userId,
    details: { previous_assignee: lead.assigned_to }
  });
}
```

#### Step 3: UI Components
- Add "Recycle" button to lead actions
- Implement confirmation dialog:
  ```
  "Are you sure you want to recycle this lead? 
   It will be unassigned and available for reassignment."
  ```
- Show recycled indicator in lead list
- Add filter for recycled leads

#### Step 4: Bulk Recycle Feature
```javascript
// Allow multiple lead selection for recycling
async function bulkRecycleLeads(leadIds, userId) {
  const results = await Promise.all(
    leadIds.map(id => recycleLead(id, userId))
  );
  return results;
}
```

#### Step 5: Recycle Rules Configuration
- Define auto-recycle conditions:
  - No activity for X days
  - Lead age exceeds threshold
  - Failed contact attempts exceed limit
- Create scheduled job for auto-recycle

---

## Implementation Timeline

### Phase 1 (Week 1-2)
1. Sales Agent/Manager Deal Creation
2. Publisher Field in Leads View
3. Jasun Delete Permission

### Phase 2 (Week 3-4)
4. Recycle Function
5. Filter on Pipeline in Sold Dashboard

### Phase 3 (Week 5-6)
6. Sales Gamification View
7. Sold Dashboard

---

## Testing Strategy

### Unit Testing
- Test all permission changes
- Validate data filtering logic
- Test recycle functionality

### Integration Testing
- Test cross-role interactions
- Validate dashboard data accuracy
- Test filter combinations

### UAT (User Acceptance Testing)
- Sales team testing for deal creation
- Dashboard usability testing
- Performance testing with production-like data

---

## Rollback Plan

Each update should have a rollback strategy:

1. **Database changes**: Keep migration rollback scripts
2. **Permission changes**: Document original permissions
3. **API changes**: Version endpoints for backward compatibility
4. **UI changes**: Feature flags for gradual rollout

---

## Monitoring and Success Metrics

### Key Metrics to Track
- Deal creation success rate by role
- Dashboard load times
- Filter usage patterns
- Recycle function adoption rate
- User satisfaction scores

### Monitoring Tools
- Application performance monitoring (APM)
- Error tracking (Sentry or similar)
- User analytics (Google Analytics/Mixpanel)
- Database query performance monitoring

---

## Documentation Requirements

### To Be Created/Updated
1. User manual for new deal creation workflow
2. Admin guide for permission management
3. Dashboard user guide
4. API documentation updates
5. Filter configuration guide

---

## Support and Training

### Training Materials
- Video tutorials for new features
- Quick reference guides
- FAQ documentation

### Support Plan
- Dedicated support during first week of rollout
- Daily standup meetings during implementation
- Slack channel for quick questions
- Bug reporting process

---

## Notes and Considerations

- Ensure all changes are backward compatible
- Implement proper error handling and user feedback
- Consider performance impact of new dashboards
- Plan for data migration if required
- Ensure GDPR/privacy compliance for data visibility changes