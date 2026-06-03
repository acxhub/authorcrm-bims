# Duplicate Lead Pattern Checker — Technical Specification

**System:** BIMS / AuthorCRM
**Database:** Supabase Postgres (`public.leads`)
**Audience:** Engineering
**Purpose:** Define the duplicate-detection rules and reference implementation for blocking/flagging duplicates at two entry points: **(A) Add New Lead** (single, real-time) and **(B) Import** (bulk/CSV).

---

## 1. Definition of a Duplicate

A new lead is considered a **duplicate** of an existing lead when they match on **at least 2 of the 4 identity points**:

| # | Point | Source column(s) |
|---|-------|------------------|
| 1 | **Name** | `author_name` (fallback: `first_name` + `last_name`) |
| 2 | **Book Title** | `book_title` |
| 3 | **Phone** | `phone_number_1` (also check `phone_number_2`, `alternative_phone_number`) |
| 4 | **Email** | `primary_email` (also check `secondary_email`, `alternative_email`) |

"At least 2 points" is the core rule. A single shared point (e.g. same name only, or same phone only) is **not** treated as a duplicate, because one author legitimately has multiple books, and shared/again-used phone numbers occur.

### 1.1 The six qualifying combinations

Two leads are duplicates if **any** of these pairs both match:

1. Name + Book Title
2. Name + Phone
3. Name + Email
4. Phone + Email
5. Phone + Book Title
6. Email + Book Title

> Combinations 4–6 (no name) are important: they catch the same person entered under a **different spelling of the name** (e.g. `Denis O'Neill` vs `Denis R O'Neill`) where the phone/email/book still match.

---

## 2. Normalization Rules (apply before comparing)

Comparisons must be done on **normalized** values, never raw strings. Apply the same normalization on both the incoming value and the stored value.

| Field | Normalization |
|-------|---------------|
| Name | `lower(trim(value))`; collapse internal multiple spaces to one; strip surrounding punctuation. Optionally strip honorifics (`Dr`, `Dr.`, `DR`, `Jr`, `Sr`, `II`) for a "loose" name match. |
| Book Title | `lower(trim(value))`; collapse multiple spaces. |
| Phone | Strip every non-digit: `regexp_replace(value, '\D', '', 'g')`. Optionally drop a leading country code `1` for US numbers before comparing. Empty string after stripping = no phone (do not match). |
| Email | `lower(trim(value))`. Empty/null = no email (do not match). |

**Empty values never match.** A blank phone must not match another blank phone. Always guard with `<> ''` and `IS NOT NULL`.

### 2.1 Reference normalization (SQL expressions)

```sql
lower(trim(author_name))                                  AS name_key
lower(trim(book_title))                                   AS book_key
regexp_replace(coalesce(phone_number_1,''), '\D','','g')  AS phone_key
lower(trim(primary_email))                                AS email_key
```

---

## 3. Match Severity (recommended UX)

Not all 2-point matches are equally strong. Recommend tiering so the UI can decide whether to **block**, **warn**, or **silently log**.

| Tier | Trigger | Suggested action on Add New Lead |
|------|---------|----------------------------------|
| **HIGH** | Phone+Email, or Name+Email, or Name+Phone match | **Block** save; show the existing lead; require explicit override or "open existing". |
| **MEDIUM** | Name+Book, Phone+Book, Email+Book match | **Warn** — show existing lead, allow save with confirmation. |
| **LOW** | Exactly one point matches (name only, phone only, …) | **Info only** — optional inline hint, never block. |

Tiers are a policy layer on top of the core rule; the detection query is the same.

---

## 4. Entry Point A — Add New Lead (real-time, single record)

### 4.1 Behavior

1. User fills the new-lead form.
2. On submit (or on blur of key fields), call the duplicate check with the normalized incoming values.
3. If one or more existing leads match on ≥2 points, return them ranked by severity.
4. UI blocks/warns per the tier table; user can open the existing lead, override, or cancel.
5. Only `deleted_at IS NULL` leads are considered (don't match against already-deleted records).

### 4.2 Reference detection query

Parameters: `:name_key`, `:book_key`, `:phone_key`, `:email_key` (already normalized by the app; pass `''` for blanks).

```sql
SELECT
  l.id,
  l.author_name,
  l.book_title,
  l.phone_number_1,
  l.primary_email,
  l.assigned_to,
  -- which points matched:
  ( (l.name_key  = :name_key  AND :name_key  <> '')::int
  + (l.book_key  = :book_key  AND :book_key  <> '')::int
  + (l.phone_key = :phone_key AND :phone_key <> '')::int
  + (l.email_key = :email_key AND :email_key <> '')::int ) AS points_matched,
  ARRAY_REMOVE(ARRAY[
     CASE WHEN l.name_key  = :name_key  AND :name_key  <> '' THEN 'name'  END,
     CASE WHEN l.book_key  = :book_key  AND :book_key  <> '' THEN 'book'  END,
     CASE WHEN l.phone_key = :phone_key AND :phone_key <> '' THEN 'phone' END,
     CASE WHEN l.email_key = :email_key AND :email_key <> '' THEN 'email' END
  ], NULL) AS matched_on
FROM (
  SELECT id, author_name, book_title, phone_number_1, primary_email, assigned_to,
         lower(trim(author_name))                                  AS name_key,
         lower(trim(book_title))                                   AS book_key,
         regexp_replace(coalesce(phone_number_1,''),'\D','','g')   AS phone_key,
         lower(trim(primary_email))                                AS email_key
  FROM public.leads
  WHERE deleted_at IS NULL
) l
WHERE
     (l.name_key  = :name_key  AND :name_key  <> '' AND (
         (l.book_key  = :book_key  AND :book_key  <> '') OR
         (l.phone_key = :phone_key AND :phone_key <> '') OR
         (l.email_key = :email_key AND :email_key <> '') ))
  OR (l.phone_key = :phone_key AND :phone_key <> '' AND (
         (l.email_key = :email_key AND :email_key <> '') OR
         (l.book_key  = :book_key  AND :book_key  <> '') ))
  OR (l.email_key = :email_key AND :email_key <> '' AND
         (l.book_key  = :book_key  AND :book_key  <> '') )
ORDER BY points_matched DESC
LIMIT 20;
```

`points_matched >= 2` is guaranteed by the `WHERE`. Return the rows to the client; `matched_on` tells the UI exactly which fields collided.

### 4.3 Performance note

The subquery normalizes every row at query time, which does **not** use indexes and will get slow as `leads` grows. For production, persist the normalized keys (Section 7) so the check is an indexed lookup instead of a full scan.

---

## 5. Entry Point B — Import (bulk / CSV)

An import must be de-duplicated in **two passes**:

### Pass 1 — Against the existing database
For each incoming row, run the same logic as Section 4 (ideally as a single set-based query, not row-by-row). Tag each incoming row with: `NEW`, `DUPLICATE_OF(existing_id)`, plus the matched points.

### Pass 2 — Within the import file itself
Two rows **inside the same file** can be duplicates of each other even if neither is in the DB yet. Run the same 2-point logic across the staged batch and collapse/flag intra-file duplicates before insert.

### 5.1 Recommended import flow

```
1. Load file into a staging set; compute name_key/book_key/phone_key/email_key per row.
2. Pass 1: match staging rows against public.leads (deleted_at IS NULL).
3. Pass 2: match staging rows against each other (group by each of the 6 combos).
4. Produce an import report:
       - rows to INSERT (no match)
       - rows skipped as duplicates (with the existing lead id / the row they duplicate)
       - rows needing manual review (HIGH-tier matches)
5. Insert only the clean rows. Never silently overwrite an existing lead.
```

### 5.2 Set-based "match against DB" query for a staging table

Assume staged rows are loaded into `import_staging` with the same normalized key columns.

```sql
SELECT s.row_no,
       l.id AS existing_lead_id,
       ( (l.name_key=s.name_key  AND s.name_key<>'')::int
       + (l.book_key=s.book_key  AND s.book_key<>'')::int
       + (l.phone_key=s.phone_key AND s.phone_key<>'')::int
       + (l.email_key=s.email_key AND s.email_key<>'')::int ) AS points_matched
FROM import_staging s
JOIN ( SELECT id,
              lower(trim(author_name)) name_key,
              lower(trim(book_title))  book_key,
              regexp_replace(coalesce(phone_number_1,''),'\D','','g') phone_key,
              lower(trim(primary_email)) email_key
       FROM public.leads WHERE deleted_at IS NULL ) l
  ON  (s.name_key=l.name_key  AND s.name_key<>''  AND ((s.book_key=l.book_key AND s.book_key<>'') OR (s.phone_key=l.phone_key AND s.phone_key<>'') OR (s.email_key=l.email_key AND s.email_key<>'')))
   OR (s.phone_key=l.phone_key AND s.phone_key<>'' AND ((s.email_key=l.email_key AND s.email_key<>'') OR (s.book_key=l.book_key AND s.book_key<>'')))
   OR (s.email_key=l.email_key AND s.email_key<>'' AND (s.book_key=l.book_key AND s.book_key<>''));
```

---

## 6. Reference Pseudocode (language-agnostic)

```text
function normalize(lead):
    lead.name_key  = collapse_spaces(lower(trim(lead.author_name)))
    lead.book_key  = collapse_spaces(lower(trim(lead.book_title)))
    lead.phone_key = digits_only(lead.phone_number_1)
    lead.email_key = lower(trim(lead.primary_email))

function points_matched(a, b):
    p = 0
    if a.name_key  != "" and a.name_key  == b.name_key:  p += 1
    if a.book_key  != "" and a.book_key  == b.book_key:  p += 1
    if a.phone_key != "" and a.phone_key == b.phone_key: p += 1
    if a.email_key != "" and a.email_key == b.email_key: p += 1
    return p

function is_duplicate(a, b):
    return points_matched(a, b) >= 2

function check_new_lead(incoming):
    normalize(incoming)
    candidates = query_existing_matches(incoming)   # the SQL in §4.2
    if candidates is empty: return ALLOW
    best = max(candidates, key = points_matched)
    tier = severity_tier(best.matched_on)           # §3
    return { decision: tier, matches: candidates }
```

---

## 7. Production Hardening — Persisted Normalized Keys + Indexes

To make the check indexed (O(log n) lookups instead of full scans), add generated columns and indexes. This is the recommended long-term implementation.

```sql
-- Generated, always-current normalized keys
ALTER TABLE public.leads
  ADD COLUMN name_key  text GENERATED ALWAYS AS (lower(trim(author_name)))                                STORED,
  ADD COLUMN book_key  text GENERATED ALWAYS AS (lower(trim(book_title)))                                 STORED,
  ADD COLUMN phone_key text GENERATED ALWAYS AS (regexp_replace(coalesce(phone_number_1,''),'\D','','g')) STORED,
  ADD COLUMN email_key text GENERATED ALWAYS AS (lower(trim(primary_email)))                              STORED;

-- Indexes for each comparison key (partial: ignore blanks)
CREATE INDEX idx_leads_name_key  ON public.leads (name_key)  WHERE name_key  <> '' AND deleted_at IS NULL;
CREATE INDEX idx_leads_book_key  ON public.leads (book_key)  WHERE book_key  <> '' AND deleted_at IS NULL;
CREATE INDEX idx_leads_phone_key ON public.leads (phone_key) WHERE phone_key <> '' AND deleted_at IS NULL;
CREATE INDEX idx_leads_email_key ON public.leads (email_key) WHERE email_key <> '' AND deleted_at IS NULL;
```

With these, the real-time check can be expressed as small `EXISTS` lookups per combination (each an index probe), e.g.:

```sql
SELECT EXISTS (
  SELECT 1 FROM public.leads
  WHERE deleted_at IS NULL
    AND phone_key = :phone_key AND :phone_key <> ''
    AND email_key = :email_key AND :email_key <> ''
);  -- repeat / OR for the other 5 combinations
```

> Optional stricter guard: a **partial unique index** on a high-confidence combo (e.g. `(phone_key, email_key)` where both non-empty) will hard-prevent the worst duplicates at the database level. Use only after the existing data is de-duplicated, or the index creation will fail on current duplicates.

---

## 8. Edge Cases & Gotchas

- **Multiple phone/email columns.** `leads` also has `phone_number_2`, `alternative_phone_number`, `secondary_email`, `alternative_email`. For maximum coverage, build the phone/email key set from all of them and match if *any* incoming phone equals *any* stored phone. Start with the primaries (`phone_number_1`, `primary_email`) and expand if false-negatives are reported.
- **Different name, same contact.** Do not skip the no-name combos (4–6). These catch re-typed names and are often the highest-value catches.
- **Tags are not identity.** A shared tag is not an identity point and must not contribute to the 2-point rule.
- **Soft-deleted leads.** Always filter `deleted_at IS NULL`. A new lead matching only a deleted record is **not** a duplicate (it may be a legitimate re-add).
- **Self-match on edit.** When the check runs on an *existing* lead being edited, exclude its own id (`AND id <> :current_lead_id`).
- **Honorifics / suffixes.** `Dr. Scott A Allen` vs `Dr Scott Allen` differ by punctuation only. Normalizing punctuation and optionally stripping `Dr/Jr/Sr/II` increases recall on the name point.
- **Whitespace duplicates.** Double internal spaces (`Karen  Elliott`) are common; collapsing spaces in normalization is required.
- **Performance.** The on-the-fly normalization queries (§4.2, §5.2) are fine for occasional single checks but will full-scan; migrate to the persisted keys (§7) before relying on this at scale or for large imports.

---

## 9. Acceptance Criteria

A correct implementation must:

1. Flag any new/imported lead that shares **≥2** of {name, book, phone, email} with an existing non-deleted lead, using normalized values.
2. Detect all six combinations, including the three name-less ones.
3. Never flag on a single shared point.
4. Never match on empty/blank values.
5. De-duplicate imports in both directions (against DB **and** within the file).
6. Exclude soft-deleted leads and the record's own id (on edit).
7. Return *which* fields matched so the UI can block vs. warn appropriately.

---

## Appendix A — Field reference (`public.leads`)

| Concept | Primary column | Secondary columns to consider |
|---------|----------------|-------------------------------|
| Name | `author_name` | `first_name`, `last_name`, `pen_name` |
| Book | `book_title` | `other_titles` (jsonb), `multiple_titles` (bool) |
| Phone | `phone_number_1` | `phone_number_2`, `alternative_phone_number` |
| Email | `primary_email` | `secondary_email`, `alternative_email` |
| Lifecycle | `deleted_at` (filter), `assigned_to`, `created_at` | |
