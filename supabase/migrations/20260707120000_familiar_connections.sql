-- =====================================================================
-- Vestige — Familiar (recap bot) connection + ingest tokens (ADDITIVE)
-- =====================================================================
-- Lets the self-hosted Familiar app post a generated session recap into a
-- campaign's journal. Each campaign gets a secret bearer token; the DM
-- pastes it into Familiar, and the journal's ingest API route authenticates
-- incoming recaps with it (server-side, service role — the token never
-- grants Supabase access directly). last_recap_at / recap_count also drive
-- the "connected / not yet" status shown in the journal.
--
-- Touches nothing existing. DO NOT run automatically — apply on a Supabase
-- branch first, then prod (see the other journal migrations).
-- =====================================================================

create table if not exists public.familiar_connections (
  campaign_id   uuid primary key references public.campaigns(id) on delete cascade,
  ingest_token  text not null unique,
  created_at    timestamptz not null default now(),
  last_recap_at timestamptz,
  recap_count   integer not null default 0
);

alter table public.familiar_connections enable row level security;

-- The token is a secret — only the campaign creator may read or manage it.
-- (The ingest API route reads/writes via the service role after validating
--  the bearer token, so it doesn't rely on these policies.)
drop policy if exists familiar_connections_select on public.familiar_connections;
create policy familiar_connections_select on public.familiar_connections
  for select to authenticated
  using (public.is_campaign_creator(campaign_id));

drop policy if exists familiar_connections_insert on public.familiar_connections;
create policy familiar_connections_insert on public.familiar_connections
  for insert to authenticated
  with check (public.is_campaign_creator(campaign_id));

drop policy if exists familiar_connections_update on public.familiar_connections;
create policy familiar_connections_update on public.familiar_connections
  for update to authenticated
  using (public.is_campaign_creator(campaign_id))
  with check (public.is_campaign_creator(campaign_id));

drop policy if exists familiar_connections_delete on public.familiar_connections;
create policy familiar_connections_delete on public.familiar_connections
  for delete to authenticated
  using (public.is_campaign_creator(campaign_id));

-- =====================================================================
-- End. Rollback: see the matching _rollback.sql.
-- =====================================================================
