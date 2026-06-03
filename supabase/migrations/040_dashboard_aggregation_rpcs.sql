-- 040_dashboard_aggregation_rpcs.sql
--
-- Server-side aggregation RPCs to replace client-side reduces over capped lead pages.
-- With ~12k leads, components that fetched a 500–1000 row slice and aggregated in JS
-- reported truncated totals (and the import wizard only checked duplicates against the
-- first 1000 leads). These functions compute the answers in Postgres over ALL rows.
--
-- All functions are SECURITY INVOKER so existing leads RLS still applies (sales users
-- only see their assigned leads, matching prior behaviour), and pin an empty search_path.

-- Aggregated lead metrics (totals, status breakdown, recent activity, month-over-month).
-- Optionally scoped to a single assignee for per-agent dashboards.
create or replace function public.get_lead_stats(p_assigned_to uuid default null)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with base as (
    select l.id, l.status_id, l.created_at, l.updated_at,
           (s.name ilike '%won%')                              as is_won,
           (s.name ilike '%lost%' or s.name ilike '%dead%')    as is_lost,
           (s.name ilike '%new lead%')                         as is_new
    from public.leads l
    left join public.statuses s on s.id = l.status_id
    where p_assigned_to is null or l.assigned_to = p_assigned_to
  )
  select jsonb_build_object(
    'total_leads',  count(*),
    'active_leads', count(*) filter (where not (coalesce(is_won,false) or coalesce(is_lost,false) or coalesce(is_new,false))),
    'closed_won',   count(*) filter (where is_won),
    'avg_time_to_close', coalesce(round(avg(ceil(extract(epoch from (updated_at - created_at)) / 86400.0)) filter (where is_won or is_lost)), 0),
    'new_leads_this_week',    count(*) filter (where created_at >= now() - interval '7 days'),
    'closed_won_this_month',  count(*) filter (where is_won  and updated_at >= now() - interval '30 days'),
    'closed_lost_this_month', count(*) filter (where is_lost and updated_at >= now() - interval '30 days'),
    'leads_this_month', count(*) filter (where created_at >= date_trunc('month', now())),
    'leads_last_month', count(*) filter (where created_at >= date_trunc('month', now()) - interval '1 month'
                                           and created_at <  date_trunc('month', now())),
    'status_counts', coalesce((
        select jsonb_agg(jsonb_build_object('status_id', t.status_id, 'count', t.c))
        from (select status_id, count(*) c from base where status_id is not null group by status_id) t
      ), '[]'::jsonb)
  )
  from base;
$$;

-- Per-creator lead counts, optionally within a created_at window (SalesBoard leaderboard).
create or replace function public.get_lead_counts_by_creator(
  p_date_from timestamptz default null,
  p_date_to   timestamptz default null
)
returns table(created_by uuid, lead_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select l.created_by, count(*)::bigint
  from public.leads l
  where l.created_by is not null
    and (p_date_from is null or l.created_at >= p_date_from)
    and (p_date_to   is null or l.created_at <= p_date_to)
  group by l.created_by;
$$;

-- Returns existing leads matching ANY supplied (normalized) value on author name,
-- book title, email or phone. A duplicate must match >=2 fields, so it is guaranteed
-- to be in this candidate set — lets the import wizard run its 2+-field rule against a
-- small set instead of loading the entire leads table.
create or replace function public.find_duplicate_lead_candidates(
  p_author_names text[] default '{}',
  p_book_titles  text[] default '{}',
  p_emails       text[] default '{}',
  p_phones       text[] default '{}'
)
returns setof public.leads
language sql
stable
security invoker
set search_path = ''
as $$
  select l.*
  from public.leads l
  where (cardinality(p_author_names) > 0 and lower(btrim(l.author_name))   = any(p_author_names))
     or (cardinality(p_book_titles)  > 0 and lower(btrim(l.book_title))    = any(p_book_titles))
     or (cardinality(p_emails)       > 0 and lower(btrim(l.primary_email)) = any(p_emails))
     or (cardinality(p_phones)       > 0 and (
            lower(btrim(l.phone_number_1))           = any(p_phones)
         or lower(btrim(l.phone_number_2))           = any(p_phones)
         or lower(btrim(l.alternative_phone_number)) = any(p_phones)
        ));
$$;
