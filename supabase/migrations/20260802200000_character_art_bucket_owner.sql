-- =====================================================================
-- Vestige — Character artwork bucket, owner-aware (IDEMPOTENT)
-- =====================================================================
-- Supersedes 20260802120000_character_art_bucket.sql. Run THIS one, not
-- that one: the original defines the write policies in their campaign-only
-- form, which would undo the owner-folder rules that 20260802180000 needs
-- for library sheets. This file creates the bucket if it is missing and
-- states the policies in their current, correct form, so it is safe whether
-- or not the original was ever applied.
--
-- Two folder shapes live here:
--   {campaign_id}/{sha1-of-foundry-path}.{ext}   the old browser upload
--   {owner_id}/{sha1-of-foundry-path}.{ext}      pushed from Foundry
-- Both public-read; sheets store full URLs, so display does not care which
-- a picture came from. Keying on the source path means the hundred items
-- sharing one stock icon store it once.
--
-- DO NOT run automatically.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('character-art', 'character-art', true)
on conflict (id) do nothing;

drop policy if exists character_art_read on storage.objects;
create policy character_art_read on storage.objects
  for select using (bucket_id = 'character-art');

-- Write into your own folder, or into a campaign you belong to.
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

drop policy if exists character_art_delete on storage.objects;
create policy character_art_delete on storage.objects
  for delete to authenticated
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
