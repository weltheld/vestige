-- =====================================================================
-- Vestige — Foundry VTT module connection + ingest tokens (ADDITIVE)
-- =====================================================================
-- Lets the vestige-foundry module push a character sheet straight out of a
-- running Foundry world, replacing the two manual steps: Export Data +
-- upload, and picking the Foundry folder so the browser can copy artwork.
--
-- Foundry can do both in one go because it is the only place that has the
-- actor JSON and the image files at the same time — it serves `icons/`,
-- `systems/`, `modules/` and `worlds/` as one URL space, so the module can
-- fetch every path the sheet references without anyone locating a folder.
--
-- Same shape as familiar_connections: one secret bearer token per campaign,
-- validated server-side with the service role. The token never grants
-- Supabase access directly.
--
-- Touches nothing existing. DO NOT run automatically — apply on a Supabase
-- branch first, then prod (see the other migrations).
-- =====================================================================

create table if not exists public.foundry_connections (
  campaign_id     uuid primary key references public.campaigns(id) on delete cascade,
  ingest_token    text not null unique,
  created_at      timestamptz not null default now(),
  last_import_at  timestamptz,
  import_count    integer not null default 0,
  verified_at     timestamptz
);

comment on column public.foundry_connections.verified_at is
  'Set by the ping route, so the connection reads as verified before any real sheet is pushed.';

alter table public.foundry_connections enable row level security;

-- The token is a secret — only the campaign creator may read or manage it.
-- (The API routes read/write via the service role after validating the
--  bearer token, so they do not rely on these policies.)
drop policy if exists foundry_connections_select on public.foundry_connections;
create policy foundry_connections_select on public.foundry_connections
  for select to authenticated
  using (public.is_campaign_creator(campaign_id));

drop policy if exists foundry_connections_insert on public.foundry_connections;
create policy foundry_connections_insert on public.foundry_connections
  for insert to authenticated
  with check (public.is_campaign_creator(campaign_id));

drop policy if exists foundry_connections_update on public.foundry_connections;
create policy foundry_connections_update on public.foundry_connections
  for update to authenticated
  using (public.is_campaign_creator(campaign_id))
  with check (public.is_campaign_creator(campaign_id));

drop policy if exists foundry_connections_delete on public.foundry_connections;
create policy foundry_connections_delete on public.foundry_connections
  for delete to authenticated
  using (public.is_campaign_creator(campaign_id));

-- =====================================================================
-- End. Rollback: see the matching _rollback.sql.
-- =====================================================================
