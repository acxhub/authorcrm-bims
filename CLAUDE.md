# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Last Updated**: February 2026
**Version**: Production-ready with real-time collaboration features

## Project Overview

Author CRM - A customer relationship management system for managing author leads, deals, and sales pipelines. Built with React 18, TypeScript, and Supabase using the Lovable.dev platform.

## Key Commands

```bash
npm run dev       # Start dev server on port 8080
npm run build     # Production build
npm run build:dev # Development build
npm run lint      # ESLint
npm run preview   # Preview production build
```

Database migrations and schema changes are managed through Supabase dashboard. Real-time subscriptions are used for live updates across users.

---

## Architecture Overview

### Tech Stack
- **React 18** + TypeScript (strict: false, noImplicitAny: false)
- **Vite 5** with `@vitejs/plugin-react-swc` + `lovable-tagger` (dev only)
- **shadcn/ui** (Radix UI + Tailwind CSS 3, base color: slate, CSS variables enabled)
- **React Query v5** (`@tanstack/react-query`) for server state
- **React Router v6** for client-side routing
- **React Hook Form + Zod** for form validation
- **Supabase** (PostgreSQL, Auth, Real-time, RLS)
- **@dnd-kit** for drag-and-drop pipeline board
- **Recharts** for data visualization
- **PapaParse + SheetJS (xlsx)** for CSV/XLS import
- **Sonner** for toast notifications (alongside Radix Toast)
- **date-fns** for date manipulation
- **lucide-react** for icons

### Path Alias
`@/*` maps to `./src/*` (configured in tsconfig.json and vite.config.ts)

### Provider Stack (App.tsx)
```
QueryClientProvider → AuthProvider → UsersProvider → RealtimeProvider → BrowserRouter → TooltipProvider
```

### React Query Global Defaults
```typescript
staleTime: 5 * 60 * 1000,    // 5 minutes
gcTime: 10 * 60 * 1000,      // 10 minutes
refetchOnWindowFocus: false,
refetchOnMount: false,
refetchOnReconnect: true,
retry: 1,
```

---

## Project Structure

```
/src
├── components/
│   ├── ui/           # 48 shadcn/ui base components + 3 custom (date-range-picker, notifications, searchable-user-select)
│   ├── admin/        # StatusManagement, TagManagement, UserManagement, CreateUserForm, EditUserForm
│   ├── auth/         # ForcePasswordReset
│   ├── dashboard/    # DashboardMetrics, RecentActivity, PipelineBreakdown, SalesLeaderboard, QuickActions
│   ├── deals/        # CreateDealModal, DealComments, LogCallModal, ReassignDealModal
│   ├── leads/        # LeadsList, LeadDetails, LeadForm, LeadActivities, LeadComments, LeadDeals,
│   │                 # LeadTagging, LeadAssignment, SimpleLeadAssign, SimpleTagAdd, BulkLeadActions,
│   │                 # ForRecycleButton, CreateLeadModal, EnhancedLeadsList, ImportLeadsModal
│   ├── pipeline/     # PipelineBoard, PipelineColumn, PipelineLeadCard, PipelineDealCard,
│   │                 # EditPipelineDealModal, MoveLeadModal
│   ├── debug/        # DealsPermissionDebug, PipelineDebug
│   ├── AppSidebar.tsx
│   ├── DashboardLayout.tsx
│   └── ProtectedRoute.tsx
├── contexts/
│   └── UsersContext.tsx  # Global users cache (all profiles, 5-min TTL)
├── hooks/            # 21 custom hooks (see Hooks Reference below)
├── integrations/
│   └── supabase/
│       ├── client.ts # Supabase client instance (typed)
│       └── types.ts  # Auto-generated DB types (Tables, Enums, Views, Functions)
├── lib/
│   ├── utils.ts      # cn() utility (clsx + tailwind-merge)
│   └── api/          # 7 API service modules (see API Layer below)
├── pages/            # 12 page components (see Routes below)
└── main.tsx          # Entry point: createRoot → <App />
```

---

## Routing & Pages

| Path | Component | Role Required | Description |
|---|---|---|---|
| `/auth` | `Auth` | None (public) | Sign in / Sign up form |
| `/` | `Index` | Any authenticated | Dashboard with metrics, activity, leaderboard |
| `/leads` | `LeadsManagement` | Any authenticated | Lead list with filters, create/edit/view modals |
| `/leads/import` | `ImportLeadsPage` | Any authenticated | 5-step CSV/XLS import wizard (no sidebar) |
| `/leads/:id` | `LeadDetailsPage` | Any authenticated | Single lead detail view with edit dialog |
| `/pipeline` | `PipelinePage` | Any authenticated | Kanban-style deal pipeline board |
| `/deals/:id` | `DealDetailsPage` | Any authenticated | Deal detail with comments, activities, real-time |
| `/sales-board` | `SalesBoard` | Any authenticated | Leaderboard, achievements, performance, sold analysis |
| `/sold-dashboard` | `SoldDashboard` | Any authenticated | Closed Won deals/leads with date filtering |
| `/admin` | `AdminPanel` | `leads_manager` | 6-tab admin panel (users, pipeline, tags, etc.) |
| `/admin/users` | `UserManagementPage` | `leads_manager` | Dedicated user management page |
| `*` | `NotFound` | None | 404 page |

**Layout pattern**: All main pages use `SidebarProvider` + `AppSidebar` + `SidebarInset` with a sticky frosted-glass header (`bg-white/80 backdrop-blur-md`). Exceptions: Auth (centered card), ImportLeadsPage (full-page wizard, no sidebar), NotFound (plain).

**Note**: `Gamification.tsx` exists in pages/ but has NO route - it's superseded by `SalesBoard`.

---

## Database Schema

### Tables (7)

**`leads`** - Author/lead information
- Key columns: `id`, `first_name`, `last_name`, `author_name`, `book_title`, `offer_title`, `primary_email`, `secondary_email`, `phone_number_1`, `phone_number_2`, `amazon_link`, `author_bio`, `publisher`, `category`, `country`, `state`, `website`, `deal_value`, `other_titles` (JSON), `multiple_titles`, `source`
- FKs: `status_id` → statuses, `assigned_to` → profiles, `created_by` → profiles

**`deals`** - Sales opportunities
- Key columns: `id`, `offer_title`, `deal_value`, `category`, `notes`
- FKs: `lead_id` → leads, `status_id` → statuses, `assigned_to` → profiles, `created_by` → profiles

**`activity_logs`** - Interaction history
- Key columns: `id`, `activity_type` (enum), `summary`, `outcome`, `activity_date`
- FKs: `lead_id` → leads, `user_id` → profiles

**`comments`** - Lead/deal comments (supports threading)
- Key columns: `id`, `content`
- FKs: `lead_id` → leads, `user_id` → profiles, `parent_comment_id` → comments (self-referential)

**`lead_tags`** - Junction table (leads ↔ tags)
- Columns: `lead_id` → leads, `tag_id` → tags, `created_at`

**`profiles`** - Extended auth users
- Key columns: `id` (matches Supabase Auth), `full_name`, `email`, `role` (string), `is_active`, `avatar_url`

**`statuses`** - Pipeline stages (shared by leads and deals)
- Key columns: `id`, `name`, `color`, `order_index`, `is_active`

**`tags`** - Categorization labels
- Key columns: `id`, `name`, `color`, `description`, `is_active`

### Views
- **`leads_with_author_name`** - Adds computed `computed_author_name` column via `get_author_name(first_name, last_name)` DB function

### Enums
- **`activity_type`**: `call`, `email`, `meeting`, `note`, `status_change`, `assignment`
- **`user_role`**: `leads_manager`, `sales_manager`, `sales`

### User Roles
| Role | Access |
|---|---|
| `leads_manager` | Full access + Admin Panel + User Management |
| `sales_manager` | Full access to leads, deals, team management |
| `sales` | Manage assigned leads and their deals |

---

## API Layer (`src/lib/api/`)

All modules follow: class definition + exported singleton instance. All queries eagerly join related profiles/statuses.

### `leads.ts` - `leadsApi`
| Method | Description |
|---|---|
| `getLeads(filters?, page?, limit?)` | Paginated leads with search, status, tag, assignment, date, source filters |
| `getLeadById(id)` | Single lead with all joins |
| `createLead(data)` / `updateLead(id, data)` / `deleteLead(id)` | CRUD (hard delete) |
| `assignLead(leadId, assignedTo)` | Update assignment |
| `updateLeadStatus(leadId, statusId)` | Update status |
| `addTagsToLead(leadId, tagIds[])` / `removeTagsFromLead(leadId, tagIds[])` | Tag management via `lead_tags` |

**Search fields**: `book_title`, `author_name`, `first_name`, `last_name`, `primary_email`, `phone_number_1`
**Tag filtering**: Uses sub-query on `lead_tags` table then `.in('id', leadIds)`

### `deals.ts` - `dealsApi`
| Method | Description |
|---|---|
| `getDeals(filters?, page?, limit?)` | Paginated deals with search, status, assignment, lead, category, date filters |
| `getDealById(id)` / `getDealsByLeadId(leadId)` | Single / by lead |
| `createDeal(data)` / `updateDeal(id, data)` / `deleteDeal(id)` | CRUD (hard delete) |
| `assignDeal(dealId, assignedTo)` / `updateDealStatus(dealId, statusId)` | Assignment/status |

### `activities.ts` - `activitiesApi` + standalone functions
| Method | Description |
|---|---|
| `getActivitiesByLeadId(leadId)` | All activities for a lead (ordered by date desc) |
| `createActivity(data)` / `updateActivity(id, data)` / `deleteActivity(id)` | CRUD |
| `logActivity(leadId, userId, type, summary, outcome?)` | Convenience helper (auto-sets date) |
| `getRecentActivities(days?)` | Activities from last N days (default 7) |
| `getActivityStats(leadId?)` | Counts by type |

### `comments.ts` - `commentsApi` + standalone functions
| Method | Description |
|---|---|
| `getCommentsByLeadId(leadId)` | Top-level comments with nested replies (N+1 pattern) |
| `createComment(data)` / `updateComment(id, data)` / `deleteComment(id)` | CRUD |
| `getReplies(parentCommentId)` | Replies for a comment |
| `getCommentStats(leadId?)` | Total + recent counts |

### `users.ts` - `usersApi`
**Uses a separate admin Supabase client** (service role key) for auth operations.

| Method | Description |
|---|---|
| `getAll(filters?, page?, limit?)` | Paginated profiles with role/active/search filter |
| `getById(id)` | Single profile |
| `create(data)` | Creates auth user + profile (auto email confirm, rollback on failure) |
| `update(id, updates)` | Update profile (+ optional force_password_reset) |
| `delete(id)` | Deactivate then delete auth user |
| `resetPassword(id, newPassword)` | Admin password reset |
| `toggleStatus(id)` | Flip `is_active` |

### `statuses.ts` - `statusesApi`
| Method | Description |
|---|---|
| `getStatuses()` | All active statuses ordered by `order_index` |
| `createStatus(data)` / `updateStatus(id, data)` | CRUD |
| `deleteStatus(id)` | Hard delete (guards if leads still reference it) |
| `reorderStatuses(updates[])` | Batch update `order_index` |
| `createDefaultStatuses()` | Seeds 8 defaults: New Lead, Contacted, Qualified, Proposal Sent, Negotiating, Closed Won, Closed Lost, Dead Lead |

### `tags.ts` - `tagsApi`
| Method | Description |
|---|---|
| `getTags()` | All active tags ordered by name |
| `createTag(data)` / `updateTag(id, data)` | CRUD |
| `deleteTag(id)` | **Soft delete** (`is_active: false`) |
| `deleteAllTags()` | Soft delete all |
| `initializePredefinedTags()` | Seeds 5 system tags: Not In Service, Wrong Number, Wrong Email, Not Interested, Dead |
| `getTagStats()` | Active/inactive counts |

---

## Hooks Reference (`src/hooks/`)

### Data CRUD Hooks
Each follows React Query patterns with query key factories, toast feedback, and cache invalidation.

| Hook | Table | staleTime | Key Operations |
|---|---|---|---|
| `useLeads(filters, page, limit)` / `useLead(id)` | leads | 5 min | CRUD + assign + status + tag management |
| `useDeals(filters, page, limit)` / `useDeal(id)` / `useDealsByLeadId(leadId)` | deals | 5 min | CRUD + assign + status |
| `useActivitiesByLeadId(leadId)` + mutations | activity_logs | 2 min | CRUD + logActivity |
| `useCommentsByLeadId(leadId)` + mutations | comments | 2 min | CRUD (threaded) |
| `useStatuses()` / `useStatus(id)` + mutations | statuses | 10 min | CRUD + reorder + seed defaults |
| `useTags()` / `useTag(id)` + mutations | tags | 10 min | CRUD + bulk delete + seed predefined |
| `useUsers(filters, page, limit)` / `useUser(id)` | profiles | 5 min | CRUD + toggle status + reset password |

### Real-time Hooks
Each subscribes to Supabase Postgres changes and invalidates React Query caches.

| Hook | Channel | Tables | Cascade Invalidation |
|---|---|---|---|
| `useLeadsRealtime()` | `leads-changes` | `leads`, `lead_tags` | `['leads']`, `['lead', id]` |
| `useDealsRealtime()` | `deals-changes` | `deals` | `['deals']`, `['deal', id]`, `['lead', leadId]` |
| `useActivitiesRealtime()` | `activities-changes` | `activity_logs` | `['activities']`, `['activity', id]` |
| `useCommentsRealtime()` | `comments-changes` | `comments` | `['comments']`, per-lead |
| `useStatusesRealtime()` | `statuses-changes` | `statuses` | `['statuses']` + cascades to `['leads']`, `['deals']` |
| `useTagsRealtime()` | `tags-changes` | `tags` | `['tags']` + cascades to `['leads']` |
| `useAppRealtime()` | - | - | Aggregates all 6 real-time hooks above |

### Analytics/Derived Hooks
| Hook | Description |
|---|---|
| `usePipelineMetrics()` | Lead pipeline analytics (totalLeads, activeLeads, conversionRate, statusBreakdown) |
| `useDealsPipelineMetrics()` | Deal pipeline analytics (totalDeals, pipelineValue, averageDealValue) |

### UI/Utility Hooks
| Hook | Description |
|---|---|
| `useAuth()` / `useProfile()` | Auth context (signUp, signIn, signOut, session) + current user profile |
| `useLeadsState()` | Persists leads list UI state (filters, pagination, scroll) to sessionStorage + URL params |
| `useIsMobile()` | Viewport < 768px detection |
| `use-toast` / `useNotifications()` | Toast notification system / in-memory notification queue |

---

## Contexts

### `UsersContext` (`src/contexts/UsersContext.tsx`)
Global cache of all user profiles (up to 100). Provides `users`, `activeUsers`, `loading`, `error`, `refreshUsers()`. 5-minute TTL. Consumed via `useUsersContext()`.

---

## Key Component Details

### `ProtectedRoute`
- Checks `useAuth()` for authentication, `useProfile()` for role authorization
- Supports optional `requiredRole` prop (`leads_manager` | `sales_manager` | `sales`)
- Handles `force_password_reset` flag by rendering `ForcePasswordReset` component
- Redirects to `/auth` if unauthenticated, `/` if unauthorized

### `AppSidebar`
Navigation items: Dashboard, Leads, Pipeline, Sold Deals, Sales Board
Quick actions: Add Lead (`/leads?action=create`), Import Leads (`/leads/import`)
Conditionally shows Admin Panel and User Management links for `leads_manager` role.
Footer shows user avatar, name, email, and sign-out button.

### `LeadsList`
Main leads table with:
- Search, status filter, assignment filter (assigned/unassigned/all), tag filter, date range filter
- Bulk actions via `BulkLeadActions` (assign, change status, add tags)
- Pagination with configurable page size
- Click to navigate to lead details
- State persistence via `useLeadsState()`

### `PipelineBoard`
Kanban board using `@dnd-kit/core` and `@dnd-kit/sortable`:
- Columns represent statuses (ordered by `order_index`)
- Cards represent deals within each status
- Drag-and-drop moves deals between statuses
- Real-time updates via `useDealsRealtime()`

### `ImportLeadsPage`
5-step wizard for CSV/XLS import:
1. **Upload**: Drag-and-drop zone (PapaParse for CSV, SheetJS for XLS/XLSX)
2. **Mapping**: Auto-map columns by header name matching, manual override
3. **Duplicates**: Check against existing leads (2+ field match: author name, book title, phone, email)
4. **Preview**: First 5 rows, status selector (required), optional user assignment
5. **Import**: Row-by-row async import with progress bar and results summary

### `SalesBoard`
4-tab analytics page:
- **Leaderboard**: Ranked sales team by revenue with medals
- **Achievements**: Gamification badges (First Deal, Deal Closer, Sales Champion, Rainmaker)
- **Performance**: Per-user metric grid
- **Sold Analysis**: Filtered closed deals with date range and user filters

---

## Query Key Conventions

```
['leads', filters, page, limit]     # Lead list
['lead', id]                         # Single lead
['deals', filters, page, limit]     # Deal list
['deals', id]                        # Single deal (also ['deal', id] in some hooks)
['deals', 'by-lead', leadId]        # Deals for a lead
['activities']                       # All activities
['activities', 'lead', leadId]      # Activities for a lead
['comments']                         # All comments
['comments', 'lead', leadId]        # Comments for a lead
['statuses']                         # All statuses
['status', id]                       # Single status
['tags']                             # All tags
['tag', id]                          # Single tag
['tag-stats']                        # Tag usage stats
['users', filters, page, limit]     # User list
['user', id]                         # Single user
```

---

## staleTime Tiers
| Tier | Duration | Entities | Rationale |
|---|---|---|---|
| High frequency | 2 min | activities, comments | Frequently updated by multiple users |
| Medium frequency | 5 min | leads, deals, users | Moderate change rate |
| Low frequency | 10 min | statuses, tags | Rarely changed (admin only) |

---

## Development Guidelines

1. **State Management**: React Query for server state, `useState`/`useReducer` for UI-only state, `UsersContext` for global user list
2. **Error Handling**: All mutations use `useToast` for user feedback (success + destructive variants)
3. **Real-time**: All real-time hooks are composed in `useAppRealtime()` mounted at app level via `RealtimeProvider` - individual components don't need to set up subscriptions
4. **Cache Invalidation**: Mutations invalidate broad query keys (`['leads']`) + targeted keys (`['lead', id]`). Real-time hooks cascade (e.g., status change invalidates leads + deals)
5. **Form Validation**: Use Zod schemas with React Hook Form
6. **Type Safety**: All data models defined in `integrations/supabase/types.ts`. Use `Tables<'tablename'>` for Row types
7. **Component Organization**: Feature components in subdirectories, shared logic in hooks, shadcn/ui primitives in `components/ui/`
8. **Soft vs Hard Delete**: Tags use soft delete (`is_active: false`), everything else uses hard delete. Status delete has a guard check.
9. **Admin Operations**: `usersApi` uses a separate admin Supabase client with service role key for auth operations (create user, reset password, delete user)

### Adding a New Feature
1. Update DB schema in Supabase dashboard
2. Regenerate/update types in `integrations/supabase/types.ts`
3. Create API module in `lib/api/` following singleton class pattern
4. Create hook in `hooks/` following React Query patterns
5. If real-time needed: create `use[Entity]Realtime.ts` hook and add to `useAppRealtime()`
6. Build UI components in relevant `components/` subdirectory
7. Add route in `App.tsx` if needed (wrap in `ProtectedRoute`)

### Real-time Subscription Pattern
```typescript
useEffect(() => {
  const channel = supabase
    .channel('entity-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'your_table' },
      (payload) => {
        queryClient.invalidateQueries({ queryKey: ['entity'] });
        const id = (payload.new as any)?.id || (payload.old as any)?.id;
        if (id) queryClient.invalidateQueries({ queryKey: ['entity', id] });
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel) };
}, [queryClient]);
```

---

## shadcn/ui Components (48 base + 3 custom)

Base: accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip

Custom: `date-range-picker.tsx`, `notifications.tsx`, `searchable-user-select.tsx`

Re-export: `ui/use-toast.ts` re-exports from `hooks/use-toast`

---

## Important Notes

- The project uses Lovable.dev platform conventions (`lovable-tagger` in dev, `gptengineer.js` in index.html)
- No test files - testing is handled by the platform
- Two toast systems coexist: Radix Toast (`useToast` / `<Toaster>`) and Sonner (`<Sonner>`)
- The `sonner.tsx` UI component imports `useTheme` from `next-themes` (installed as dependency)
- TypeScript is configured permissively: `strict: false`, `noImplicitAny: false`, `strictNullChecks: false`
- ESLint has `@typescript-eslint/no-unused-vars: off`
- Always check for existing patterns before implementing new features
- Use existing shadcn/ui components before creating new ones
- Deployment: Vercel-ready (`vercel.json` present), static assets from `/public`
