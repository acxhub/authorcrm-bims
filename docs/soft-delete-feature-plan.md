# Soft Delete Feature Plan

**Goal:** No one can permanently delete anything. All "deletes" archive first. After 30 days in archive, only **Admins** (`leads_manager`) can permanently delete.

**Scope:** All deletable entities and features across the app.

---

## 1. Entities and Current Behavior

| Entity | Table(s) | Current delete | Notes |
|--------|----------|----------------|-------|
| **Leads** | `leads` | Hard delete | Has `recycled_at` / `recycled_by` (different: recycle = unassign/reset). |
| **Deals** | `deals` | Hard delete | FK to leads, commissions, company_revenue. |
| **Activities** | `activity_logs` | Hard delete | FK to leads, profiles. |
| **Comments** | `comments` | Hard delete | FK to leads, profiles, self (replies). |
| **Tags** | `tags` | Soft delete (`is_active: false`) | Already soft; align to archive + 30-day rule. |
| **Statuses** | `statuses` | Hard delete | Referenced by leads/deals; guard "in use" exists. |
| **Users** | `profiles` + `auth.users` | Deactivate profile + delete auth user | Special: auth lifecycle. |
| **Commission tiers** | `commission_tiers` | Hard delete | FK to commission_templates. |
| **Lead–tag links** | `lead_tags` | Hard delete on remove | Junction; consider cascade from lead archive. |

**Out of scope for 30-day archive (or special handling):**
- **Users:** Keep current behavior: deactivate profile, then admin deletes auth user. Optionally add "archived_at" on profile and delay auth delete by 30 days (see 4.2).
- **Lead_tags:** When a lead is archived, we don’t need to soft-delete each row; they’re hidden with the lead. When removing a tag from a lead, we can keep hard delete (no “archive tag assignment” requirement unless you want it).

---

## 2. Data Model: Archive Columns

Use a consistent pattern on every soft-deletable table:

- `deleted_at` (timestamptz, nullable) — when it was archived.
- `deleted_by` (uuid, nullable) — who archived it (FK to `profiles.id`).

**Tables to extend:**

| Table | Add columns |
|-------|-------------|
| `leads` | `deleted_at`, `deleted_by` |
| `deals` | `deleted_at`, `deleted_by` |
| `activity_logs` | `deleted_at`, `deleted_by` |
| `comments` | `deleted_at`, `deleted_by` |
| `statuses` | `deleted_at`, `deleted_by` (and treat as “archived” instead of hard delete when not in use). |
| `tags` | Already has `is_active`. Add `deleted_at`, `deleted_by`; “delete” = set both + `is_active: false` for consistency. |
| `commission_tiers` | `deleted_at`, `deleted_by` |

**Optional (profile delay delete):**

- `profiles`: add `deleted_at`, `deleted_by`; keep `is_active`; delay `auth.users` delete until 30 days after `deleted_at`.

---

## 3. Business Rules

1. **Archive (what everyone can do):**
   - Any user with current “delete” permission calls **archive** instead of delete.
   - Back end sets `deleted_at = now()`, `deleted_by = auth.uid()`.
   - No row is removed.

2. **Default reads:**
   - All list/detail queries exclude archived rows: `deleted_at IS NULL` (or equivalent for tags: still filter `is_active` and optionally `deleted_at IS NULL`).

3. **30-day rule:**
   - Permanent delete allowed only if `deleted_at < now() - interval '30 days'`.
   - Only role `leads_manager` can call permanent delete.

4. **Restore (optional but recommended):**
   - Admins (or allowed roles) can **restore** by setting `deleted_at = NULL`, `deleted_by = NULL` (and for tags, `is_active = true`). Restore allowed anytime before permanent delete.

---

## 4. Implementation Phases

### Phase 1: Schema and RLS

1. **Migration**
   - Add `deleted_at`, `deleted_by` to: `leads`, `deals`, `activity_logs`, `comments`, `statuses`, `tags`, `commission_tiers`.
   - Add FK for each `deleted_by` → `profiles.id` (nullable).
   - Optional: add to `profiles` if delaying user delete.

2. **RLS**
   - **SELECT:** For each table, ensure policies only return rows where `deleted_at IS NULL` for “active” data (or add a single policy that excludes archived by default). Option: use a DB view per table (e.g. `leads_active`) that has `WHERE deleted_at IS NULL` and point app to that for default reads.
   - **UPDATE:** Allow setting `deleted_at`/`deleted_by` (archive) for users who can currently “delete”; allow clearing them (restore) for admins.
   - **DELETE:** Allow only for `leads_manager` and only when `deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days'`. Option: enforce in app + optional DB trigger/function so that direct `.delete()` is rejected if condition not met.

3. **Indexes**
   - `(deleted_at)` (or `(deleted_at) WHERE deleted_at IS NOT NULL`) on each soft-delete table for list/cleanup queries.

### Phase 2: API Layer

1. **Leads** (`src/lib/api/leads.ts`)
   - All reads: add `.is('deleted_at', null)` (or use view).
   - `deleteLead(id)` → rename to `archiveLead(id)` and set `deleted_at`, `deleted_by`; require current user.
   - Add `permanentlyDeleteLead(id)`: check `deleted_at` & 30 days + caller is admin (or rely on RLS); then `.delete()`.
   - Optional: `restoreLead(id)`: set `deleted_at = null`, `deleted_by = null`; admin-only or same as current delete permission.

2. **Deals** (`src/lib/api/deals.ts`)
   - Same pattern: default filter `deleted_at IS NULL`; `archiveDeal`; `permanentlyDeleteDeal` (admin + 30 days); optional `restoreDeal`.

3. **Activities** (`src/lib/api/activities.ts`)
   - Same: filter out archived in `getActivitiesByLeadId`; `deleteActivity` → `archiveActivity`; add `permanentlyDeleteActivity` (admin + 30 days); optional restore.

4. **Comments** (`src/lib/api/comments.ts`)
   - Same: filter in `getCommentsByLeadId` / `getReplies`; archive; permanent delete (admin + 30 days); optional restore.

5. **Statuses** (`src/lib/api/statuses.ts`)
   - Same: reads exclude archived; `deleteStatus` → `archiveStatus` (and keep “no leads/deals using it” check before archive); `permanentlyDeleteStatus` (admin + 30 days).

6. **Tags** (`src/lib/api/tags.ts`)
   - Already soft via `is_active`. Add `deleted_at`/`deleted_by`; `deleteTag` sets those + `is_active: false`. Add `permanentlyDeleteTag` (admin + 30 days). Default reads already filter `is_active`; also exclude where `deleted_at` not null if you want consistency.

7. **Commission tiers** (`src/lib/api/commission-templates.ts`)
   - Same: archive tier; permanent delete (admin + 30 days); reads filter `deleted_at IS NULL`.

8. **Users** (`src/lib/api/users.ts`)
   - If not delaying auth delete: keep current behavior (deactivate + delete auth user; only `leads_manager`).
   - If delaying: add `deleted_at`/`deleted_by` on profile, “delete user” only archives; cron or admin job after 30 days calls auth delete and then hard-deletes or hides profile.

### Phase 3: Hooks and Permissions

1. **Hooks**
   - `useLeads`: expose `archiveLead` and `permanentlyDeleteLead` (and restore if implemented). Same for deals, activities, comments, statuses, tags, commission tiers.
   - Mutations: archive = same permission as current delete; permanent delete = admin-only and only when 30 days passed. Hooks can take `profile.role === 'leads_manager'` and optionally `deleted_at` to show “Permanently delete” only when allowed.

2. **Permission helper**
   - e.g. `canPermanentlyDelete(profile, entityWithDeletedAt)` → `profile?.role === 'leads_manager' && entityWithDeletedAt?.deleted_at && isOlderThan30Days(entityWithDeletedAt.deleted_at)`.

### Phase 4: UI

1. **Copy and actions**
   - Replace “Delete” with “Archive” everywhere (leads list, lead detail, deals, activities, comments, statuses, tags, commission tiers).
   - Confirmation: “Archive this [lead/deal/…]? It will be hidden and can be restored by an admin until permanently deleted after 30 days.”

2. **Archive / Trash views (admin)**
   - Admin-only section (e.g. under `/admin` or `/admin/archive`):
     - List archived leads, deals, activities, comments, statuses, tags, tiers (or one unified “archive” with type filter).
     - Show `deleted_at` and “Eligible for permanent delete after [date]”.
     - Actions: **Restore** (clear `deleted_at`/`deleted_by`); **Permanently delete** (only when 30 days passed, button disabled otherwise with tooltip).

3. **Detail pages**
   - If a user opens a direct link to an archived entity (e.g. lead), show “This [lead] has been archived on [date]. Only admins can restore or permanently delete after 30 days.” and do not show normal edit/delete; show “Restore” and “Permanently delete” for admins when eligible.

4. **Existing “recycle” vs “archive”**
   - Recycle (leads): unassign, clear tags, reset status — keep as is; it’s separate from archive. Archive = “soft delete lead”; recycle = “put back in pool.”

### Phase 5: Real-time and Edge Cases

1. **Real-time**
   - Existing channels (leads, deals, activities, comments, statuses, tags): archive is an UPDATE; no change to subscription. For “archive” lists, you can subscribe to updates so that when something is archived it appears in the archive view.

2. **Cascading**
   - **Lead archived:** Optionally auto-archive all its deals (set `deleted_at`/`deleted_by` on deals where `lead_id = ?`) so pipeline and deal lists stay consistent. Or leave deals as-is and hide them when lead is archived (filter in app). Prefer explicit deal archive when lead is archived for clarity.
   - **Deal archived:** No cascade required; commissions can keep referencing the deal (deal row still exists).

3. **Foreign keys**
   - All FKs remain valid because we never remove rows until permanent delete. When permanently deleting a lead, you must either: permanently delete or null out dependent rows (deals, activity_logs, comments, lead_tags) in the right order, or restrict permanent delete of lead until all dependents are permanently deleted or unlinked.

---

## 5. Summary Checklist

- [ ] Migration: add `deleted_at`, `deleted_by` to leads, deals, activity_logs, comments, statuses, tags, commission_tiers (and optionally profiles).
- [ ] RLS: default SELECT excludes archived; UPDATE allows archive/restore; DELETE only for leads_manager and only when archived ≥ 30 days (or enforce in app + optional DB).
- [ ] API: every current “delete” becomes “archive”; add “permanentlyDelete” (admin + 30 days) and optional “restore” for each entity.
- [ ] Hooks: expose archive, permanentlyDelete, restore; permission checks for permanent delete.
- [ ] UI: “Archive” instead of “Delete”; admin archive/trash view with restore and permanent delete (disabled until 30 days).
- [ ] Tags: align to same columns and 30-day rule; keep `is_active` for backward compatibility.
- [ ] Users: either keep current delete flow or add profile archive + 30-day-delayed auth delete.
- [ ] Cascade: define behavior when archiving a lead (e.g. archive its deals); define order of permanent deletes (dependents first or batch in transaction).

---

## 6. Files to Touch (high level)

| Area | Files |
|------|--------|
| DB | New migration in Supabase |
| Types | `src/integrations/supabase/types.ts` (regenerate after migration) |
| API | `leads.ts`, `deals.ts`, `activities.ts`, `comments.ts`, `statuses.ts`, `tags.ts`, `commission-templates.ts`, optionally `users.ts` |
| Hooks | `useLeads.ts`, `useDeals.ts`, `useActivities.ts`, `useComments.ts`, `useStatuses.ts`, `useTags.ts`, `useCommissionTemplates.ts`, optionally `useUsers.ts` |
| UI | LeadsList, EnhancedLeadsList, LeadDetailsPage, BulkLeadActions, DealComments, LeadComments, LeadDeals, StatusManagement, TagManagement, UserManagement, CommissionTemplateManager; new Admin Archive/Trash page and route |

This plan applies the same behavior across all components and features: archive first, 30-day window, then only Admins can permanently delete.
