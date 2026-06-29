-- =====================================================================
-- Council of Days — session days
-- Lets the campaign creator mark specific dates as game sessions.
-- The "upcoming vs played" state is derived from the date at read time,
-- so a marked day flips to "played" automatically once it passes.
-- Run this in the Supabase SQL Editor.
-- =====================================================================

create table if not exists public.campaign_sessions (
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  date         date not null,
  note         text not null default '',
  created_at   timestamptz not null default now(),
  primary key (campaign_id, date)
);

create index if not exists campaign_sessions_campaign_idx
  on public.campaign_sessions (campaign_id);

alter table public.campaign_sessions enable row level security;

-- Members may read the campaign's session days.
drop policy if exists campaign_sessions_select on public.campaign_sessions;
create policy campaign_sessions_select on public.campaign_sessions
  for select to authenticated
  using (public.is_campaign_member(campaign_id));

-- Only the creator may add / change / remove session days.
drop policy if exists campaign_sessions_insert on public.campaign_sessions;
create policy campaign_sessions_insert on public.campaign_sessions
  for insert to authenticated
  with check (public.is_campaign_creator(campaign_id));

drop policy if exists campaign_sessions_update on public.campaign_sessions;
create policy campaign_sessions_update on public.campaign_sessions
  for update to authenticated
  using (public.is_campaign_creator(campaign_id))
  with check (public.is_campaign_creator(campaign_id));

drop policy if exists campaign_sessions_delete on public.campaign_sessions;
create policy campaign_sessions_delete on public.campaign_sessions
  for delete to authenticated
  using (public.is_campaign_creator(campaign_id));
