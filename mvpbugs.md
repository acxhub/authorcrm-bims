# Author CRM - MVP Bugs & Issues Report

**Document Purpose:** Technical issue summary for Claude Code remediation  
**Date:** February 16, 2026  
**Priority:** High - Production blocking issues

---

## Critical Bugs

### BUG-001: Lead Creation Failure - Missing 'source' Column

**Module:** Lead Management / Add Lead Form  
**Severity:** Critical  
**Status:** Open

**Error Message:**
```
Failed to create lead: Could not find the 'source' column of 'leads' in the schema cache
```

**Steps to Reproduce:**
1. Navigate to Add Lead form
2. Fill in lead details
3. Submit the form

**Expected Result:** Lead is created successfully  
**Actual Result:** Form submission fails with schema cache error

**Root Cause Analysis:**
- Schema cache mismatch between Supabase and frontend types
- The `source` column may have been renamed, removed, or not synced
- Possible migration issue where column exists in DB but not in cached schema

**Technical Investigation Points:**
- [ ] Check `leads` table schema in Supabase for `source` column
- [ ] Verify TypeScript types match database schema
- [ ] Clear and regenerate Supabase schema cache
- [ ] Check if column was renamed to `lead_source` or similar
- [ ] Review recent database migrations

---

### BUG-002: Lead Distribution Timestamp/Sorting Anomaly

**Module:** Lead Management / Distribution  
**Severity:** Critical  
**Status:** Open

**Description:**  
Newly distributed leads display incorrect timestamps (showing "2 months ago" or "4 months ago" instead of "just now") and are buried deep in pagination (page 16+ instead of page 1).

**Steps to Reproduce:**
1. Distribute or assign new leads via CRM
2. Navigate to Leads list view
3. Sort by default (Created Date / Latest)
4. Observe position and timestamp of newly distributed leads

**Expected Result:**
- Newly distributed leads appear on page 1
- Timestamp shows "Just now" or "X minutes ago"

**Actual Result:**
- Leads appear on page 16+ with timestamps showing months ago
- New leads are effectively hidden from agents

**Root Cause Analysis:**
- Timezone mismatch between backend and frontend
- Wrong date field being used (e.g., `created_at` instead of `assigned_at` or `distributed_at`)
- Sorting logic referencing outdated timestamp field
- Cache/index not refreshing after lead distribution

**Technical Investigation Points:**
- [ ] Verify timezone configuration in Supabase and frontend
- [ ] Check which timestamp field is used for sorting (`created_at` vs `assigned_at` vs `updated_at`)
- [ ] Ensure `assigned_at` or `distributed_at` field updates on distribution
- [ ] Review sorting query in leads list component
- [ ] Check if real-time subscription is properly updating lead data
- [ ] Verify date formatting utility handles timezones correctly

---

### BUG-003: Publisher Search Not Working

**Module:** Search / Filtering  
**Severity:** High  
**Status:** Open

**Description:**  
Search by Publisher does not return results or fails to filter correctly. This functionality was previously working.

**Steps to Reproduce:**
1. Open CRM search bar
2. Enter a valid publisher name
3. Execute search

**Expected Result:** Leads associated with the entered publisher are returned  
**Actual Result:** No results found / incorrect filtering

**Business Context:**  
Sales agents are assigned per publisher, making this a critical workflow dependency.

**Root Cause Analysis:**
- Publisher field may have been removed or renamed in search index
- Search query no longer includes `publisher_id` or `publisher_name`
- Fuzzy search configuration may not include publisher fields
- Database index on publisher field may be missing or corrupted

**Technical Investigation Points:**
- [ ] Check search implementation in `useSearch` hook or search utility
- [ ] Verify publisher field is included in searchable fields array
- [ ] Check if `publisher` relationship is properly joined in search query
- [ ] Review Supabase full-text search configuration
- [ ] Test publisher search directly in Supabase SQL editor
- [ ] Verify publisher field exists and is populated in leads table

---

### BUG-004: Sales Users Cannot Add Single Leads

**Module:** Sales / Lead Entry  
**Severity:** High  
**Status:** Open

**Description:**  
Sales users are unable to add single leads manually in the CRM.

**Steps to Reproduce:**
1. Login as Sales user role
2. Navigate to Sales or Lead Conversion module
3. Attempt to add a single lead manually

**Expected Result:** Sales users can manually add single leads  
**Actual Result:** Lead submission fails or add option is unavailable

**Root Cause Analysis:**
- Frontend validation blocking submission
- API endpoint for single lead creation returning error
- Role/permission (RLS) changes restricting sales access
- Missing required fields or status mapping issues

**Technical Investigation Points:**
- [ ] Check RLS policies on `leads` table for Sales role
- [ ] Verify form validation rules aren't over-restrictive
- [ ] Test lead creation API endpoint with Sales role token
- [ ] Review role-based UI component visibility
- [ ] Check if required fields are hidden from Sales role but still required

---

## Feature Requests / Improvements

### FR-001: Move Sales Fields to First Page

**Priority:** Medium  
**Requested By:** Sales Team

**Description:**  
Relocate key sales fields from later pages/tabs to the first/main page of lead details.

**Business Justification:**
- Team members overlook leads because important fields are buried in distant pages
- Critical sales information should be immediately visible and editable
- Will reduce ignored leads and improve follow-up consistency

**Implementation Notes:**
- [ ] Identify which fields are considered "key sales fields"
- [ ] Update lead detail component layout
- [ ] Consider responsive design implications
- [ ] May need to reorganize tab structure

---

### FR-002: Add "Delete Tags" Function for Lead Recycling

**Priority:** Medium  
**Requested By:** Sales Team

**Description:**  
Ability to delete or reset tags when recycling leads.

**Requirements:**
When a lead is recycled:
- **Tags** → Cleared/reset to empty
- **Status** → Reset to initial state (e.g., "New")
- **Comments/History** → Preserved (maintain audit trail)

**Business Justification:**
- Keeps lead records reusable without losing conversation history
- Avoids confusion from old/stale tagging
- Maintains clean workflow tracking while preserving audit trail

**Implementation Notes:**
- [ ] Create "Recycle Lead" function/action
- [ ] Clear tags array on lead record
- [ ] Reset status to default
- [ ] Preserve `notes` and `activity_log` fields
- [ ] Add confirmation dialog before recycling
- [ ] Consider adding "recycled_at" timestamp for tracking

---

## Summary Table

| ID | Issue | Module | Severity | Type |
|----|-------|--------|----------|------|
| BUG-001 | Missing 'source' column in schema | Lead Creation | Critical | Bug |
| BUG-002 | Timestamp/sorting anomaly | Lead Distribution | Critical | Bug |
| BUG-003 | Publisher search not working | Search/Filter | High | Bug |
| BUG-004 | Sales users can't add leads | Sales/Permissions | High | Bug |
| FR-001 | Move sales fields to first page | UI/UX | Medium | Feature |
| FR-002 | Delete tags on recycle | Lead Management | Medium | Feature |

---

## Recommended Fix Priority

1. **BUG-001** - Blocks all manual lead creation
2. **BUG-002** - Causes agents to miss new leads (revenue impact)
3. **BUG-003** - Breaks publisher-based workflow
4. **BUG-004** - Limits sales team functionality
5. **FR-002** - Improves lead recycling workflow
6. **FR-001** - UI/UX improvement

---

## Technical Context

**Stack:**
- Frontend: React 18, TypeScript, Vite
- Backend: Supabase (PostgreSQL, RLS, Real-time)
- State Management: React hooks
- Search: Fuzzy matching implementation

**Relevant Files to Investigate:**
- `src/types/database.ts` - TypeScript types for Supabase
- `src/hooks/useLeads.ts` - Lead data fetching/mutations
- `src/components/leads/` - Lead list and form components
- `src/utils/search.ts` - Search implementation
- `supabase/migrations/` - Database migrations
- RLS policies in Supabase dashboard
