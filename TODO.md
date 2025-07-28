# Author CRM - Improvement Todo List

## High Priority

### 1. Fix User Dropdown Pagination Issue ✅ COMPLETED
- [x] **Update `useUsers` hook calls** to fetch all users (limit 1000) in assignment components
- [x] **Files to update:**
  - [x] `src/components/deals/CreateDealModal.tsx`
  - [x] `src/components/pipeline/EditPipelineDealModal.tsx`
  - [x] `src/components/leads/LeadAssignment.tsx`
  - [x] `src/components/leads/SimpleLeadAssign.tsx`
  - [x] `src/components/deals/ReassignDealModal.tsx`
  - [x] `src/components/pipeline/PipelineBoard.tsx`

### 2. Add Source Field for Lead Distribution ✅ COMPLETED
- [x] **Create database migration** to add `source` field to leads table
- [x] **Update TypeScript types** in `src/integrations/supabase/types.ts`
- [x] **Update API layer** in `src/lib/api/leads.ts`
- [x] **Update form components:**
  - [x] `src/components/leads/LeadForm.tsx`
  - [ ] `src/components/leads/ImportLeadsModal.tsx`
  - [ ] `src/pages/ImportLeadsPage.tsx`
- [ ] **Update lead display components** to show source field
- [x] **Add source field to search/filter functionality**

## Medium Priority

### 3. Improve Author Search in Deal Creation ✅ COMPLETED
- [x] **Enhance search logic** in `src/components/deals/CreateDealModal.tsx`
- [x] **Add duplicate detection** and warning system
- [x] **Improve search across** first_name, last_name, and author_name fields
- [x] **Add manual author entry option** for new authors not in system
- [x] **Add fuzzy search** for better matching

### 4. Fix Dropdown Scrolling Issues ✅ COMPLETED
- [x] **Add proper scrolling** to all SelectContent components
- [x] **Set max-height** and overflow-y-auto classes
- [x] **Test scrolling behavior** in all dropdown components
- [x] **Files to update:**
  - [x] All SelectContent components in assignment modals
  - [x] Status selection dropdowns
  - [x] Tag selection dropdowns

### 5. Verify Pipeline Metrics Logic ✅ COMPLETED
- [x] **Review `usePipelineMetrics.ts`** logic for closed status handling
- [x] **Verify dashboard metrics** are correctly excluding closed lost deals
- [x] **Test with sample data** to confirm calculations
- [x] **Update metrics display** if needed

## Additional Improvements

### 6. Performance Optimizations
- [ ] **Implement virtual scrolling** for large user lists
- [ ] **Add debounced search** for better performance
- [ ] **Optimize API calls** to reduce unnecessary requests

### 7. User Experience Enhancements
- [ ] **Add loading states** for all dropdowns
- [ ] **Improve error handling** and user feedback
- [ ] **Add keyboard navigation** for dropdowns
- [ ] **Implement auto-complete** for author search

## Notes
- Priority order: 1 > 2 > 3 > 4 > 5
- User dropdown issue affects multiple features and should be fixed first
- Source field requires database migration and careful testing
- All changes should maintain backward compatibility 