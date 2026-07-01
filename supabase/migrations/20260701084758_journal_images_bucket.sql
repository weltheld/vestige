-- =====================================================================
-- Vestige — Journal images storage bucket (ADDITIVE)
-- =====================================================================
-- Adds a `journal-images` storage bucket for session cover images and
-- inline images embedded in note sections (Tiptap image nodes). Character
-- portraits continue to reuse the existing `avatars` bucket — no change there.
--
-- Files are stored under {campaign_id}/... . Any campaign member may upload
-- (unlike `banners`, which is creator-only) since any member can author a
-- session recap. Public read, like the other buckets.
--
-- Touches no existing bucket, table, or policy. DO NOT run automatically.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('journal-images', 'journal-images', true)
on conflict (id) do nothing;

drop policy if exists journal_images_read on storage.objects;
create policy journal_images_read on storage.objects
  for select using (bucket_id = 'journal-images');

drop policy if exists journal_images_insert on storage.objects;
create policy journal_images_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'journal-images'
    and public.is_campaign_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists journal_images_update on storage.objects;
create policy journal_images_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'journal-images'
    and public.is_campaign_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists journal_images_delete on storage.objects;
create policy journal_images_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'journal-images'
    and public.is_campaign_member(((storage.foldername(name))[1])::uuid)
  );
