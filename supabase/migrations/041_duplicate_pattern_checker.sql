-- 041_duplicate_pattern_checker.sql
--
-- Duplicate Lead Pattern Checker (see Duplicate_Pattern_Checker_Spec.md).
-- Two leads are duplicates when they match on >=2 of {name, book, phone, email} using
-- normalized values (the spec's six pairwise combinations, incl. the three name-less ones).
-- Matching spans ALL contact columns and ignores soft-deleted rows.
--
-- Supersedes find_duplicate_lead_candidates (040), which ignored deleted_at and only
-- covered the primary contact columns.
--
-- Persisted, normalized key columns make the checks indexed lookups instead of full scans.

-- 0. NANP-aware phone normalizer: digits only, dropping a leading US country code '1'
--    on 11-digit numbers so "+1 555…" matches a stored 10-digit "555…". IMMUTABLE so it
--    can be used inside the generated column below.
create or replace function public.dup_phone_key(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when length(regexp_replace(coalesce(p,''),'\D','','g')) = 11
         and left(regexp_replace(coalesce(p,''),'\D','','g'),1) = '1'
    then right(regexp_replace(coalesce(p,''),'\D','','g'),10)
    else regexp_replace(coalesce(p,''),'\D','','g')
  end
$$;

-- 1. Generated normalized keys (STORED; auto-backfilled). Expressions must be IMMUTABLE,
--    so name uses || concatenation (concat_ws is only STABLE).
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS name_key text GENERATED ALWAYS AS (
    lower(btrim(regexp_replace(
      coalesce(nullif(btrim(author_name), ''), btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))),
      '\s+', ' ', 'g')))
  ) STORED,
  ADD COLUMN IF NOT EXISTS book_key text GENERATED ALWAYS AS (
    lower(btrim(regexp_replace(coalesce(book_title, ''), '\s+', ' ', 'g')))
  ) STORED,
  ADD COLUMN IF NOT EXISTS phone_keys text[] GENERATED ALWAYS AS (
    array_remove(ARRAY[
      nullif(public.dup_phone_key(phone_number_1), ''),
      nullif(public.dup_phone_key(phone_number_2), ''),
      nullif(public.dup_phone_key(alternative_phone_number), '')
    ], NULL)
  ) STORED,
  ADD COLUMN IF NOT EXISTS email_keys text[] GENERATED ALWAYS AS (
    array_remove(ARRAY[
      nullif(lower(btrim(primary_email)), ''),
      nullif(lower(btrim(secondary_email)), ''),
      nullif(lower(btrim(alternative_email)), '')
    ], NULL)
  ) STORED;

-- 2. Partial indexes (active rows only) — btree for scalar keys, GIN for the array keys (&&).
CREATE INDEX IF NOT EXISTS idx_leads_name_key   ON public.leads (name_key) WHERE deleted_at IS NULL AND name_key <> '';
CREATE INDEX IF NOT EXISTS idx_leads_book_key   ON public.leads (book_key) WHERE deleted_at IS NULL AND book_key <> '';
CREATE INDEX IF NOT EXISTS idx_leads_phone_keys ON public.leads USING gin (phone_keys) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_email_keys ON public.leads USING gin (email_keys) WHERE deleted_at IS NULL;

-- 3. Single-record real-time check (Add New Lead / edit). Pass p_exclude_id when editing.
create or replace function public.check_lead_duplicates(
  p_name text default null,
  p_book text default null,
  p_phones text[] default '{}',
  p_emails text[] default '{}',
  p_exclude_id uuid default null
)
returns table(
  id uuid, author_name text, book_title text, phone_number_1 text, primary_email text,
  assigned_to uuid, points_matched int, matched_on text[], tier text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with norm as (
    select
      lower(btrim(regexp_replace(coalesce(p_name,''), '\s+', ' ', 'g'))) as nk,
      lower(btrim(regexp_replace(coalesce(p_book,''), '\s+', ' ', 'g'))) as bk,
      (select array_remove(array_agg(nullif(public.dup_phone_key(x),'')), null)
         from unnest(coalesce(p_phones,'{}'::text[])) x) as pks,
      (select array_remove(array_agg(nullif(lower(btrim(x)),'')), null)
         from unnest(coalesce(p_emails,'{}'::text[])) x) as eks
  ),
  cand as (
    select l.id from public.leads l, norm n where l.deleted_at is null and n.nk <> '' and l.name_key = n.nk
    union
    select l.id from public.leads l, norm n where l.deleted_at is null and n.bk <> '' and l.book_key = n.bk
    union
    select l.id from public.leads l, norm n where l.deleted_at is null and coalesce(array_length(n.pks,1),0) > 0 and l.phone_keys && n.pks
    union
    select l.id from public.leads l, norm n where l.deleted_at is null and coalesce(array_length(n.eks,1),0) > 0 and l.email_keys && n.eks
  ),
  scored as (
    select l.id, l.author_name, l.book_title, l.phone_number_1, l.primary_email, l.assigned_to,
      (n.nk <> '' and l.name_key = n.nk) as m_name,
      (n.bk <> '' and l.book_key = n.bk) as m_book,
      (coalesce(array_length(n.pks,1),0) > 0 and l.phone_keys && n.pks) as m_phone,
      (coalesce(array_length(n.eks,1),0) > 0 and l.email_keys && n.eks) as m_email
    from public.leads l
    join cand c on c.id = l.id
    cross join norm n
    where p_exclude_id is null or l.id <> p_exclude_id
  )
  select id, author_name, book_title, phone_number_1, primary_email, assigned_to,
    (m_name::int + m_book::int + m_phone::int + m_email::int) as points_matched,
    array_remove(array[
      case when m_name then 'name' end,
      case when m_book then 'book' end,
      case when m_phone then 'phone' end,
      case when m_email then 'email' end], null) as matched_on,
    case
      when (m_phone and m_email) or (m_name and m_email) or (m_name and m_phone) then 'HIGH'
      when (m_name and m_book) or (m_phone and m_book) or (m_email and m_book) then 'MEDIUM'
      else 'LOW'
    end as tier
  from scored
  where (m_name::int + m_book::int + m_phone::int + m_email::int) >= 2
  order by points_matched desc
  limit 20;
$$;

-- 4. Bulk import Pass-1: match many staged rows against existing leads in one set-based call.
--    p_rows = jsonb array of { row_no:int, name:text, book:text, phones:[text], emails:[text] }.
create or replace function public.check_lead_duplicates_batch(p_rows jsonb)
returns table(
  row_no int, existing_lead_id uuid, existing_label text,
  points_matched int, matched_on text[], tier text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with rows as (
    select
      (r->>'row_no')::int as row_no,
      lower(btrim(regexp_replace(coalesce(r->>'name',''), '\s+', ' ', 'g'))) as nk,
      lower(btrim(regexp_replace(coalesce(r->>'book',''), '\s+', ' ', 'g'))) as bk,
      (select array_remove(array_agg(nullif(public.dup_phone_key(x),'')), null)
         from jsonb_array_elements_text(coalesce(r->'phones','[]'::jsonb)) x) as pks,
      (select array_remove(array_agg(nullif(lower(btrim(x)),'')), null)
         from jsonb_array_elements_text(coalesce(r->'emails','[]'::jsonb)) x) as eks
    from jsonb_array_elements(coalesce(p_rows,'[]'::jsonb)) r
  ),
  hits as (
    select s.row_no, l.id, l.author_name, l.book_title, 'name'::text as pt
      from rows s join public.leads l on l.deleted_at is null and s.nk <> '' and l.name_key = s.nk
    union all
    select s.row_no, l.id, l.author_name, l.book_title, 'book'
      from rows s join public.leads l on l.deleted_at is null and s.bk <> '' and l.book_key = s.bk
    union all
    select s.row_no, l.id, l.author_name, l.book_title, 'phone'
      from rows s join public.leads l on l.deleted_at is null and coalesce(array_length(s.pks,1),0) > 0 and l.phone_keys && s.pks
    union all
    select s.row_no, l.id, l.author_name, l.book_title, 'email'
      from rows s join public.leads l on l.deleted_at is null and coalesce(array_length(s.eks,1),0) > 0 and l.email_keys && s.eks
  ),
  agg as (
    select row_no, id as existing_lead_id,
      max(author_name) as author_name, max(book_title) as book_title,
      array_agg(distinct pt order by pt) as matched_on,
      count(distinct pt) as points_matched
    from hits
    group by row_no, id
    having count(distinct pt) >= 2
  )
  select row_no, existing_lead_id,
    (coalesce(nullif(btrim(author_name),''),'(no name)') || coalesce(' - ' || nullif(btrim(book_title),''), '')) as existing_label,
    points_matched::int,
    matched_on,
    case
      when matched_on @> array['phone','email'] or matched_on @> array['name','email'] or matched_on @> array['name','phone'] then 'HIGH'
      when matched_on @> array['name','book'] or matched_on @> array['phone','book'] or matched_on @> array['email','book'] then 'MEDIUM'
      else 'LOW'
    end as tier
  from agg
  order by row_no, points_matched desc;
$$;

-- 5. Remove the interim 040 helper now superseded by check_lead_duplicates*.
drop function if exists public.find_duplicate_lead_candidates(text[], text[], text[], text[]);

-- 6. Secure leftover duplicate-cleanup scratch tables if present (RLS was disabled while
--    they remain exposed via PostgREST). Deny-all by default; service-role/migrations
--    bypass RLS. Drop them instead once the cleanup is confirmed complete.
ALTER TABLE IF EXISTS public._dupclean_del ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public._dupclean_rea ENABLE ROW LEVEL SECURITY;

-- NOTE: A partial UNIQUE index on a high-confidence combo (e.g. (name_key,...) where non-empty)
-- is intentionally NOT added — current data has 500+ active leads already sharing phone+email,
-- so a unique constraint would fail. Revisit after de-duplicating existing data.
