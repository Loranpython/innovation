-- =====================================================================
-- Patient Communication Screen — Supabase setup (run ONCE in SQL Editor)
-- Project: innovation (yvstfixolrqskmpmjevl)
--
-- Prototype with FICTIONAL patient data only. No login: anyone with the
-- site URL can read and acknowledge requests. Acceptable for a university
-- demo, NOT for real patient data.
-- =====================================================================

-- 1. Table ---------------------------------------------------------------
create table if not exists public.notifications (
  id               uuid primary key default gen_random_uuid(),
  patient          text not null default 'Patient' check (char_length(patient) between 1 and 60),
  room             text not null check (char_length(room) between 1 and 20),
  type             text not null check (type in ('toilet', 'drink', 'food', 'pain', 'speech')),
  details          jsonb not null default '{}'::jsonb check (pg_column_size(details) < 20000),
  status           text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  created_at       timestamptz not null default now(),
  acknowledged_at  timestamptz,
  resolved_at      timestamptz
);

create index if not exists notifications_status_created_idx on public.notifications (status, created_at);
create index if not exists notifications_room_created_idx   on public.notifications (room, created_at desc);

-- 2. Status rules + timestamps (set by the database, not by the browser) --
-- Allowed: open -> acknowledged -> resolved, or open -> resolved.
create or replace function public.notifications_status_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if (old.status = 'open' and new.status in ('acknowledged', 'resolved'))
     or (old.status = 'acknowledged' and new.status = 'resolved') then
    if new.status = 'acknowledged' then
      new.acknowledged_at := now();
    end if;
    if new.status = 'resolved' then
      new.resolved_at := now();
      new.acknowledged_at := coalesce(old.acknowledged_at, now());
    end if;
    return new;
  end if;

  raise exception 'Invalid status change: % -> %', old.status, new.status;
end;
$$;

drop trigger if exists notifications_status_guard on public.notifications;
create trigger notifications_status_guard
  before update on public.notifications
  for each row execute function public.notifications_status_guard();

-- 3. Grants: what the browser (publishable key) may do at all -----------
--    read everything, create a request (only these 4 columns),
--    change ONLY the status. No delete.
revoke all on public.notifications from anon, authenticated;
grant select                                   on public.notifications to anon, authenticated;
grant insert (patient, room, type, details)    on public.notifications to anon, authenticated;
grant update (status)                          on public.notifications to anon, authenticated;

-- 4. Row Level Security -------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "demo read"   on public.notifications;
drop policy if exists "demo insert" on public.notifications;
drop policy if exists "demo update" on public.notifications;

create policy "demo read" on public.notifications
  for select to anon, authenticated
  using (true);

create policy "demo insert" on public.notifications
  for insert to anon, authenticated
  with check (status = 'open');

create policy "demo update" on public.notifications
  for update to anon, authenticated
  using (status <> 'resolved')
  with check (true);

-- 5. Realtime -----------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- =====================================================================
-- Demo reset (run manually in the SQL Editor when you want a clean list):
--   delete from public.notifications;
-- =====================================================================
