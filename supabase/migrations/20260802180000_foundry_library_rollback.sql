-- Rollback for 20260802180000_foundry_library.sql
--
-- Returns tokens and sheets to being campaign-scoped. Sheets still sitting
-- in a library (no campaign) cannot survive that and are deleted — there is
-- no campaign to put them in, which is the whole reason they were there.

delete from public.character_sheets where campaign_id is null;

drop index if exists public.character_sheets_owner_actor_key;
drop index if exists public.character_sheets_owner_idx;

alter table public.character_sheets alter column campaign_id set not null;
alter table public.character_sheets drop column if exists owner_id;

alter table public.character_sheets
  add constraint character_sheets_campaign_id_foundry_actor_id_key
  unique (campaign_id, foundry_actor_id);

drop policy if exists character_sheets_select on public.character_sheets;
create policy character_sheets_select on public.character_sheets
  for select to authenticated
  using (public.is_campaign_member(campaign_id));

drop policy if exists character_sheets_insert on public.character_sheets;
create policy character_sheets_insert on public.character_sheets
  for insert to authenticated
  with check (public.is_campaign_member(campaign_id));

drop policy if exists character_sheets_update on public.character_sheets;
create policy character_sheets_update on public.character_sheets
  for update to authenticated
  using (public.is_campaign_member(campaign_id))
  with check (public.is_campaign_member(campaign_id));

drop policy if exists character_sheets_delete on public.character_sheets;
create policy character_sheets_delete on public.character_sheets
  for delete to authenticated
  using (public.is_campaign_member(campaign_id));

drop policy if exists character_art_insert on storage.objects;
create policy character_art_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'character-art'
    and public.is_campaign_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists character_art_update on storage.objects;
create policy character_art_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'character-art'
    and public.is_campaign_member(((storage.foldername(name))[1])::uuid)
  );

drop table if exists public.foundry_connections;

create table public.foundry_connections (
  campaign_id     uuid primary key references public.campaigns(id) on delete cascade,
  ingest_token    text not null unique,
  created_at      timestamptz not null default now(),
  last_import_at  timestamptz,
  import_count    integer not null default 0,
  verified_at     timestamptz
);

alter table public.foundry_connections enable row level security;

create policy foundry_connections_select on public.foundry_connections
  for select to authenticated using (public.is_campaign_creator(campaign_id));
create policy foundry_connections_insert on public.foundry_connections
  for insert to authenticated with check (public.is_campaign_creator(campaign_id));
create policy foundry_connections_update on public.foundry_connections
  for update to authenticated using (public.is_campaign_creator(campaign_id))
  with check (public.is_campaign_creator(campaign_id));
create policy foundry_connections_delete on public.foundry_connections
  for delete to authenticated using (public.is_campaign_creator(campaign_id));
