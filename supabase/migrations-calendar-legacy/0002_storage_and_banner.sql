-- =====================================================================
-- Council of Days — storage buckets (avatars, banners) + campaign banner
-- Run this in the Supabase SQL Editor after 0001_init.sql.
-- Idempotent — safe to re-run.
-- =====================================================================

-- ---------- campaigns.banner_url --------------------------------------
alter table public.campaigns
  add column if not exists banner_url text;

-- ---------- storage buckets -------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('banners', 'banners', true)
on conflict (id) do nothing;

-- ---------- avatars policies ------------------------------------------
-- Public read; each user may write only inside a folder named by their uid.
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- banners policies ------------------------------------------
-- Public read; only the campaign creator may write inside a folder named
-- by the campaign id.
drop policy if exists banners_read on storage.objects;
create policy banners_read on storage.objects
  for select using (bucket_id = 'banners');

drop policy if exists banners_insert on storage.objects;
create policy banners_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'banners'
    and exists (
      select 1 from public.campaigns c
      where c.id::text = (storage.foldername(name))[1]
        and c.creator_id = auth.uid()
    )
  );

drop policy if exists banners_update on storage.objects;
create policy banners_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'banners'
    and exists (
      select 1 from public.campaigns c
      where c.id::text = (storage.foldername(name))[1]
        and c.creator_id = auth.uid()
    )
  );

drop policy if exists banners_delete on storage.objects;
create policy banners_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'banners'
    and exists (
      select 1 from public.campaigns c
      where c.id::text = (storage.foldername(name))[1]
        and c.creator_id = auth.uid()
    )
  );
