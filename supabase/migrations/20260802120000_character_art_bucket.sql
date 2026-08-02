-- =====================================================================
-- Vestige — Character artwork storage bucket (ADDITIVE)
-- =====================================================================
-- Foundry exports reference images by PATH ("icons/weapons/sword.webp"),
-- never by value — the JSON has no image bytes in it. So the pictures can't
-- arrive with the sheet: the player points the importer at their Foundry data
-- folder once, and the files the sheet actually references are copied here.
--
-- Copied rather than hotlinked, deliberately. A link to a running Foundry
-- instance works only while that machine is awake and reachable, which for a
-- localhost install means "for one person, sometimes". A copy works for every
-- member of the campaign, forever, offline.
--
-- Files are stored under {campaign_id}/{sha1-of-foundry-path}.{ext}: keying on
-- the source path means the hundred items sharing one stock icon upload it
-- once, and a re-import finds it already there.
--
-- Mirrors journal-images: any campaign member may write, public read.
-- Touches no existing bucket, table, or policy. DO NOT run automatically.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('character-art', 'character-art', true)
on conflict (id) do nothing;

drop policy if exists character_art_read on storage.objects;
create policy character_art_read on storage.objects
  for select using (bucket_id = 'character-art');

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

drop policy if exists character_art_delete on storage.objects;
create policy character_art_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'character-art'
    and public.is_campaign_member(((storage.foldername(name))[1])::uuid)
  );
