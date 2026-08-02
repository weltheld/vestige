-- =====================================================================
-- Vestige — Foundry pushes land in a person's library (ADDITIVE + REWORK)
-- =====================================================================
-- Until now a push token belonged to a CAMPAIGN, so a sheet arrived already
-- filed. That put the decision in the wrong place: the person running the
-- Foundry world knows which characters exist, and the admin knows which
-- campaign they are for. Now the token belongs to a PERSON, sheets land in
-- their library, and the campaign is chosen here afterwards.
--
-- The assignment is the thing that must survive: pushing again updates the
-- sheet in place and never touches campaign_id or player_id, so the module
-- can be pushed after every session without anyone re-filing anything.
--
-- Safe to run on the existing data: the one campaign-scoped token in
-- existence is dropped (re-paste a new one from the library page), and every
-- imported sheet keeps its campaign, gaining an owner derived from whoever
-- imported it.
--
-- DO NOT run automatically.
-- =====================================================================

-- --------------------------------------------------------------------
-- 1. Tokens belong to people
-- --------------------------------------------------------------------
-- Recreated rather than altered: the primary key changes, the existing row
-- is a single token of the user's own, and reissuing it is one copy-paste.

drop table if exists public.foundry_connections;

create table public.foundry_connections (
  owner_id        uuid primary key references public.profiles(id) on delete cascade,
  ingest_token    text not null unique,
  created_at      timestamptz not null default now(),
  last_import_at  timestamptz,
  import_count    integer not null default 0,
  verified_at     timestamptz
);

alter table public.foundry_connections enable row level security;

-- Your token, nobody else's. The API routes validate the bearer token with
-- the service role, so they do not depend on these policies.
drop policy if exists foundry_connections_own on public.foundry_connections;
create policy foundry_connections_own on public.foundry_connections
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- --------------------------------------------------------------------
-- 2. Sheets belong to people, and may not be filed yet
-- --------------------------------------------------------------------

alter table public.character_sheets
  add column if not exists owner_id uuid references public.profiles(id) on delete cascade;

-- Existing sheets: whoever uploaded them, falling back to the campaign's
-- creator for rows imported before imported_by was recorded.
update public.character_sheets s
set owner_id = coalesce(s.imported_by, c.creator_id)
from public.campaigns c
where s.owner_id is null and c.id = s.campaign_id;

-- Anything still without an owner has no campaign to inherit one from and
-- nothing to display it against.
delete from public.character_sheets where owner_id is null;

alter table public.character_sheets alter column owner_id set not null;

-- A sheet in the library has no campaign yet. This is the normal state
-- between a push and the admin filing it.
alter table public.character_sheets alter column campaign_id drop not null;

-- The upsert key moves with the ownership. Keyed on the person and the
-- Foundry actor: pushing the same character again updates that one row
-- wherever it has since been filed, which is what makes re-pushing safe.
alter table public.character_sheets
  drop constraint if exists character_sheets_campaign_id_foundry_actor_id_key;

create unique index if not exists character_sheets_owner_actor_key
  on public.character_sheets (owner_id, foundry_actor_id);

create index if not exists character_sheets_owner_idx
  on public.character_sheets (owner_id);

-- --------------------------------------------------------------------
-- 3. Who can see what
-- --------------------------------------------------------------------
-- Two audiences now: the owner, who sees their own sheets whether filed or
-- not, and the campaign, which sees the sheets filed into it.

drop policy if exists character_sheets_select on public.character_sheets;
create policy character_sheets_select on public.character_sheets
  for select to authenticated
  using (
    owner_id = auth.uid()
    or (campaign_id is not null and public.is_campaign_member(campaign_id))
  );

drop policy if exists character_sheets_insert on public.character_sheets;
create policy character_sheets_insert on public.character_sheets
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and (campaign_id is null or public.is_campaign_member(campaign_id))
  );

-- Updates cover three different jobs: the owner filing a sheet, the DM
-- allocating it to a player, and either of them re-importing artwork.
drop policy if exists character_sheets_update on public.character_sheets;
create policy character_sheets_update on public.character_sheets
  for update to authenticated
  using (
    owner_id = auth.uid()
    or (campaign_id is not null and public.is_campaign_member(campaign_id))
  )
  with check (
    owner_id = auth.uid()
    or (campaign_id is not null and public.is_campaign_member(campaign_id))
  );

-- Deleting is the owner's alone. A sheet filed into a campaign is still the
-- pusher's copy, and unfiling it is what the campaign side does instead.
drop policy if exists character_sheets_delete on public.character_sheets;
create policy character_sheets_delete on public.character_sheets
  for delete to authenticated
  using (owner_id = auth.uid());

-- --------------------------------------------------------------------
-- 4. Artwork for sheets that have no campaign yet
-- --------------------------------------------------------------------
-- character-art is keyed {campaign_id}/{sha1-of-path}, which a library sheet
-- cannot satisfy. Pushed artwork goes under the OWNER's id instead; the
-- browser flow keeps writing campaign folders, and both are public-read, so
-- display does not care which a URL came from.

drop policy if exists character_art_insert on storage.objects;
create policy character_art_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'character-art'
    and (
      ((storage.foldername(name))[1])::uuid = auth.uid()
      or public.is_campaign_member(((storage.foldername(name))[1])::uuid)
    )
  );

drop policy if exists character_art_update on storage.objects;
create policy character_art_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'character-art'
    and (
      ((storage.foldername(name))[1])::uuid = auth.uid()
      or public.is_campaign_member(((storage.foldername(name))[1])::uuid)
    )
  );

-- =====================================================================
-- End. Rollback: see the matching _rollback.sql.
-- =====================================================================
