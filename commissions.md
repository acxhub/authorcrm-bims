# Author CRM - Commission Tracker System

**Document Purpose:** Technical specification for commission tracking implementation  
**Date:** February 16, 2026  
**Module:** Sales Commissions & Revenue Tracking

---

## Overview

A flexible commission tracking system for sales agents based on deal value, featuring configurable tiered structures, markup splits, approval workflows, and role-based visibility.

---

## Core Requirements

### Commission Calculation Base
- **Primary Base:** Deal total value
- **Markup Handling:** Configurable percentage of markup is commissionable
  - Example: 50% goes to agent (commissionable), 50% goes to company (tracked separately)

### Key Features
- Tiered commission structures (admin-configurable)
- Commission templates assignable to agents
- Custom percentage overrides per agent
- Sales Manager override capability
- Approval workflow before payout
- Monthly/Quarterly aggregation reporting
- Full audit trail / history log
- Company revenue tracking (non-commissionable portion)

---

## Database Schema

### Table: `commission_templates`

```sql
CREATE TABLE commission_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  calculation_type VARCHAR(20) NOT NULL CHECK (calculation_type IN ('graduated', 'flat_rate')),
  -- graduated: each tier applies to its portion only
  -- flat_rate: highest tier reached applies to entire amount
  markup_commissionable_percent DECIMAL(5,2) DEFAULT 50.00,
  -- What % of markup is commissionable to agent
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `commission_tiers`

```sql
CREATE TABLE commission_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES commission_templates(id) ON DELETE CASCADE,
  min_amount DECIMAL(12,2) NOT NULL,
  max_amount DECIMAL(12,2), -- NULL means unlimited
  commission_percent DECIMAL(5,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_range CHECK (max_amount IS NULL OR max_amount > min_amount)
);

-- Example tiers for a template:
-- Tier 1: $0 - $1,000 → 3%
-- Tier 2: $1,000 - $2,000 → 5%
-- Tier 3: $2,000 - $5,000 → 10%
-- Tier 4: $5,000+ → 15%
```

### Table: `agent_commission_settings`

```sql
CREATE TABLE agent_commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES commission_templates(id) ON DELETE SET NULL,
  -- Custom overrides (if set, these override template values)
  custom_commission_percent DECIMAL(5,2), -- Flat override percentage
  custom_markup_percent DECIMAL(5,2), -- Override markup commissionable %
  -- Settings
  use_custom_override BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(agent_id)
);
```

### Table: `commissions`

```sql
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id),
  
  -- Deal values at time of commission calculation
  deal_value DECIMAL(12,2) NOT NULL,
  markup_amount DECIMAL(12,2) DEFAULT 0,
  base_commission_amount DECIMAL(12,2) NOT NULL, -- Before any overrides
  
  -- Markup split tracking
  markup_commissionable_percent DECIMAL(5,2), -- % of markup that was commissionable
  markup_commission_amount DECIMAL(12,2) DEFAULT 0, -- Agent's portion of markup
  company_markup_amount DECIMAL(12,2) DEFAULT 0, -- Company's portion of markup
  
  -- Final amounts
  total_commission_amount DECIMAL(12,2) NOT NULL, -- Final commission to agent
  
  -- Calculation metadata
  template_id UUID REFERENCES commission_templates(id),
  template_name VARCHAR(100), -- Snapshot for audit
  calculation_type VARCHAR(20), -- graduated or flat_rate
  tier_breakdown JSONB, -- Detailed tier calculations for audit
  
  -- Override tracking
  is_overridden BOOLEAN DEFAULT false,
  override_amount DECIMAL(12,2),
  override_reason TEXT,
  overridden_by UUID REFERENCES users(id),
  overridden_at TIMESTAMPTZ,
  
  -- Approval workflow
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  paid_at TIMESTAMPTZ,
  
  -- Period tracking
  commission_period DATE, -- First day of month/quarter for aggregation
  period_type VARCHAR(10) DEFAULT 'monthly' CHECK (period_type IN ('monthly', 'quarterly')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `commission_audit_log`

```sql
CREATE TABLE commission_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id UUID REFERENCES commissions(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  -- e.g., 'created', 'approved', 'rejected', 'overridden', 'paid', 'recalculated'
  previous_values JSONB,
  new_values JSONB,
  performed_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `company_revenue`

```sql
CREATE TABLE company_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  commission_id UUID REFERENCES commissions(id),
  revenue_type VARCHAR(30) NOT NULL CHECK (revenue_type IN ('markup_share', 'other')),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  revenue_period DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Commission Calculation Logic

### Calculation Flow

```typescript
interface CommissionCalculation {
  dealValue: number;
  markupAmount: number;
  template: CommissionTemplate;
  agentSettings: AgentCommissionSettings;
}

function calculateCommission(input: CommissionCalculation): CommissionResult {
  const { dealValue, markupAmount, template, agentSettings } = input;
  
  // Step 1: Determine markup split
  const markupCommissionablePercent = agentSettings.custom_markup_percent 
    ?? template.markup_commissionable_percent;
  
  const agentMarkupPortion = markupAmount * (markupCommissionablePercent / 100);
  const companyMarkupPortion = markupAmount - agentMarkupPortion;
  
  // Step 2: Calculate commissionable base
  const commissionableBase = dealValue + agentMarkupPortion;
  
  // Step 3: Check for custom override
  if (agentSettings.use_custom_override && agentSettings.custom_commission_percent) {
    return {
      baseCommission: commissionableBase * (agentSettings.custom_commission_percent / 100),
      markupCommission: 0, // Included in base when using flat override
      companyMarkup: companyMarkupPortion,
      totalCommission: commissionableBase * (agentSettings.custom_commission_percent / 100),
      calculationType: 'custom_override'
    };
  }
  
  // Step 4: Apply tiered calculation
  if (template.calculation_type === 'graduated') {
    return calculateGraduated(commissionableBase, template.tiers, companyMarkupPortion);
  } else {
    return calculateFlatRate(commissionableBase, template.tiers, companyMarkupPortion);
  }
}

// Graduated: Each tier applies only to the amount within that tier
function calculateGraduated(amount: number, tiers: Tier[], companyMarkup: number): CommissionResult {
  let totalCommission = 0;
  let remaining = amount;
  const breakdown = [];
  
  for (const tier of tiers.sort((a, b) => a.min_amount - b.min_amount)) {
    if (remaining <= 0) break;
    
    const tierMax = tier.max_amount ?? Infinity;
    const tierRange = tierMax - tier.min_amount;
    const amountInTier = Math.min(remaining, tierRange);
    const tierCommission = amountInTier * (tier.commission_percent / 100);
    
    breakdown.push({
      tier: `${tier.min_amount}-${tier.max_amount ?? '∞'}`,
      amount: amountInTier,
      percent: tier.commission_percent,
      commission: tierCommission
    });
    
    totalCommission += tierCommission;
    remaining -= amountInTier;
  }
  
  return {
    totalCommission,
    companyMarkup,
    tierBreakdown: breakdown,
    calculationType: 'graduated'
  };
}

// Flat Rate: Highest tier reached applies to entire amount
function calculateFlatRate(amount: number, tiers: Tier[], companyMarkup: number): CommissionResult {
  const applicableTier = tiers
    .filter(t => amount >= t.min_amount)
    .sort((a, b) => b.min_amount - a.min_amount)[0];
  
  const commission = amount * (applicableTier.commission_percent / 100);
  
  return {
    totalCommission: commission,
    companyMarkup,
    tierBreakdown: [{
      tier: `${applicableTier.min_amount}-${applicableTier.max_amount ?? '∞'}`,
      amount,
      percent: applicableTier.commission_percent,
      commission
    }],
    calculationType: 'flat_rate'
  };
}
```

---

## Role-Based Access Control

### Visibility Matrix

| Role | Own Commissions | Team Commissions | All Commissions | Admin Settings |
|------|-----------------|------------------|-----------------|----------------|
| Agent (Sales) | ✅ View only | ❌ | ❌ | ❌ |
| Sales Manager | ✅ View + Override | ✅ View + Override | ❌ | ❌ |
| Leads Manager | ✅ Full access | ✅ Full access | ✅ Full access | ✅ Full access |

### RLS Policies

```sql
-- Agents see only their own commissions
CREATE POLICY "agents_view_own_commissions" ON commissions
  FOR SELECT USING (
    agent_id = auth.uid()
    OR 
    -- Sales Managers see their team
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = commissions.agent_id
      AND u.manager_id = auth.uid()
    )
    OR
    -- Leads Manager sees all
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'leads_manager'
    )
  );

-- Only Sales Managers and Leads Managers can override
CREATE POLICY "managers_can_override" ON commissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('sales_manager', 'leads_manager')
    )
  );

-- Only Leads Manager can manage templates
CREATE POLICY "admin_manage_templates" ON commission_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'leads_manager'
    )
  );
```

---

## API Endpoints

### Commission Templates (Admin Only)

```typescript
// GET /api/commission-templates
// List all templates

// POST /api/commission-templates
// Create new template with tiers

// PUT /api/commission-templates/:id
// Update template

// DELETE /api/commission-templates/:id
// Soft delete template

// POST /api/commission-templates/:id/tiers
// Add tier to template

// PUT /api/commission-templates/:templateId/tiers/:tierId
// Update tier

// DELETE /api/commission-templates/:templateId/tiers/:tierId
// Remove tier
```

### Agent Commission Settings

```typescript
// GET /api/agents/:id/commission-settings
// Get agent's commission settings

// PUT /api/agents/:id/commission-settings
// Update agent's template assignment or custom overrides
```

### Commissions

```typescript
// GET /api/commissions
// List commissions (filtered by role visibility)
// Query params: agent_id, status, period_start, period_end, period_type

// GET /api/commissions/:id
// Get single commission with full audit trail

// POST /api/deals/:dealId/calculate-commission
// Calculate commission for a deal (preview, doesn't save)

// POST /api/deals/:dealId/commissions
// Create commission record for a deal

// PUT /api/commissions/:id/override
// Override commission amount (Sales Manager+)
// Body: { amount, reason }

// PUT /api/commissions/:id/approve
// Approve commission for payout

// PUT /api/commissions/:id/reject
// Reject commission
// Body: { reason }

// PUT /api/commissions/:id/mark-paid
// Mark commission as paid
```

### Reporting

```typescript
// GET /api/commissions/aggregate
// Get aggregated commission data
// Query params: period_type (monthly/quarterly), start_date, end_date, agent_id

// GET /api/commissions/export
// Export commission report (CSV/Excel)

// GET /api/company-revenue/summary
// Get company revenue from markup shares
```

---

## UI Components

### Admin: Commission Template Manager

```
┌─────────────────────────────────────────────────────────────────┐
│ Commission Templates                              [+ New Template] │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Standard Sales Template                        [Default] ✓  │ │
│ │ Type: Graduated | Markup Split: 50%                         │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ $0 - $1,000      │ 3%  │ [Edit] [Delete]               │ │ │
│ │ │ $1,000 - $2,000  │ 5%  │ [Edit] [Delete]               │ │ │
│ │ │ $2,000 - $5,000  │ 10% │ [Edit] [Delete]               │ │ │
│ │ │ $5,000+          │ 15% │ [Edit] [Delete]               │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ │                                        [+ Add Tier] [Edit]  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Senior Agent Template                                       │ │
│ │ Type: Flat Rate | Markup Split: 60%                         │ │
│ │ ...                                                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Admin: Agent Commission Assignment

```
┌─────────────────────────────────────────────────────────────────┐
│ Agent Commission Settings: John Smith                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Template Assignment                                             │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [v] Standard Sales Template                                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [ ] Enable Custom Overrides                                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Custom Commission %:  [_____%] (overrides template tiers)   │ │
│ │ Custom Markup %:      [_____%] (default: 50%)               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Notes: ________________________________________________________ │
│                                                                 │
│                                    [Cancel] [Save Settings]     │
└─────────────────────────────────────────────────────────────────┘
```

### Commission Dashboard (Agent View)

```
┌─────────────────────────────────────────────────────────────────┐
│ My Commissions                           Period: [February 2026]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│ │   $12,450    │ │    $8,200    │ │    $4,250    │              │
│ │  This Month  │ │   Approved   │ │   Pending    │              │
│ └──────────────┘ └──────────────┘ └──────────────┘              │
│                                                                 │
│ Recent Commissions                                              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Deal              │ Value    │ Commission │ Status          │ │
│ ├───────────────────┼──────────┼────────────┼─────────────────┤ │
│ │ Book Deal #1234   │ $5,000   │ $625       │ ● Approved      │ │
│ │ Book Deal #1189   │ $3,200   │ $384       │ ○ Pending       │ │
│ │ Book Deal #1156   │ $8,500   │ $1,105     │ ● Paid          │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Sales Manager: Commission Approval Queue

```
┌─────────────────────────────────────────────────────────────────┐
│ Commission Approvals                    [Export] [Bulk Approve] │
├─────────────────────────────────────────────────────────────────┤
│ Filter: [All Agents ▼] [Pending ▼] [This Month ▼]              │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [ ] │ Agent      │ Deal        │ Value  │ Commission │ Act  │ │
│ ├─────┼────────────┼─────────────┼────────┼────────────┼──────┤ │
│ │ [x] │ John S.    │ Deal #1234  │ $5,000 │ $625       │ [▼]  │ │
│ │ [ ] │ Sarah M.   │ Deal #1189  │ $3,200 │ $384       │ [▼]  │ │
│ │ [x] │ Mike R.    │ Deal #1201  │ $7,800 │ $936       │ [▼]  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Actions: [Approve Selected] [Override] [Reject]                 │
└─────────────────────────────────────────────────────────────────┘
```

### Override Modal

```
┌─────────────────────────────────────────────────────────────────┐
│ Override Commission                                       [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Deal: Book Deal #1234                                           │
│ Agent: John Smith                                               │
│ Calculated Commission: $625.00                                  │
│                                                                 │
│ Override Amount: [$________]                                    │
│                                                                 │
│ Reason (required):                                              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                                                             │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                              [Cancel] [Apply Override]          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Reporting & Aggregation

### Monthly/Quarterly Summary Query

```sql
-- Monthly aggregation by agent
SELECT 
  agent_id,
  u.name as agent_name,
  DATE_TRUNC('month', commission_period) as period,
  COUNT(*) as total_deals,
  SUM(deal_value) as total_deal_value,
  SUM(total_commission_amount) as total_commission,
  SUM(CASE WHEN status = 'paid' THEN total_commission_amount ELSE 0 END) as paid_commission,
  SUM(CASE WHEN status = 'pending' THEN total_commission_amount ELSE 0 END) as pending_commission,
  SUM(CASE WHEN status = 'approved' THEN total_commission_amount ELSE 0 END) as approved_commission
FROM commissions c
JOIN users u ON c.agent_id = u.id
WHERE commission_period BETWEEN :start_date AND :end_date
GROUP BY agent_id, u.name, DATE_TRUNC('month', commission_period)
ORDER BY period DESC, total_commission DESC;
```

### Company Revenue Report

```sql
-- Company markup revenue by period
SELECT 
  DATE_TRUNC('month', revenue_period) as period,
  SUM(amount) as total_company_revenue,
  COUNT(DISTINCT deal_id) as deal_count
FROM company_revenue
WHERE revenue_type = 'markup_share'
GROUP BY DATE_TRUNC('month', revenue_period)
ORDER BY period DESC;
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Create database tables and migrations
- [ ] Set up RLS policies
- [ ] Build commission template CRUD (admin)
- [ ] Implement tier management UI

### Phase 2: Core Logic (Week 2-3)
- [ ] Implement commission calculation engine
- [ ] Build agent commission settings management
- [ ] Create commission record generation on deal close
- [ ] Implement markup split tracking

### Phase 3: Workflow (Week 3-4)
- [ ] Build approval workflow UI
- [ ] Implement override functionality
- [ ] Add commission status tracking
- [ ] Create audit logging

### Phase 4: Reporting (Week 4-5)
- [ ] Build agent commission dashboard
- [ ] Create manager approval queue
- [ ] Implement monthly/quarterly aggregation
- [ ] Add export functionality
- [ ] Build company revenue tracking view

### Phase 5: Polish (Week 5-6)
- [ ] Add real-time updates
- [ ] Performance optimization
- [ ] Testing and bug fixes
- [ ] Documentation

---

## Technical Notes

### Integration Points
- **Deals Module:** Trigger commission calculation when deal moves to "Closed Won"
- **Users Module:** Link to agent commission settings
- **Pipeline:** Display commission preview in deal card

### Considerations
- Store template snapshots in commission records for audit accuracy
- Use database transactions for commission + company revenue creation
- Consider caching template data for performance
- Implement soft deletes for templates to preserve historical references

---

## Summary

| Feature | Description |
|---------|-------------|
| Tiered Commissions | Configurable tiers with graduated or flat-rate calculation |
| Markup Split | Configurable agent vs company split, tracked separately |
| Templates | Reusable commission structures assignable to agents |
| Custom Overrides | Per-agent customization that overrides template values |
| Manager Override | Sales Managers can override individual commission amounts |
| Approval Workflow | Pending → Approved → Paid status flow |
| Aggregation | Monthly and quarterly commission summaries |
| Audit Trail | Full history of all commission changes |
| Role-Based Access | Agents see own, Managers see team, Admin sees all |
