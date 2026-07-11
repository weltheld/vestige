-- =====================================================================
-- Council of Days — per-campaign character identity + image library
-- Run in the Supabase SQL Editor after 0004_sessions.sql. Idempotent.
-- =====================================================================

-- ---------- per-campaign character overrides --------------------------
-- A member can adopt a different character name / portrait per campaign.
-- NULL means "fall back to the global profile".
alter table public.campaign_members
  add column if not exists character_name text,
  add column if not exists avatar_url     text;

-- ---------- reusable image library ------------------------------------
-- Every portrait a user uploads is recorded here so it can be re-picked
-- across campaigns. The files themselves live in the existing `avatars`
-- bucket under {user_id}/… (its per-user-folder RLS already applies).
create table if not exists public.user_images (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  url         text not null,
  created_at  timestamptz not null default now()
);

create index if not exists user_images_user_idx
  on public.user_images (user_id, created_at desc);

alter table public.user_images enable row level security;

drop policy if exists user_images_select_self on public.user_images;
create policy user_images_select_self on public.user_images
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists user_images_insert_self on public.user_images;
create policy user_images_insert_self on public.user_images
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists user_images_delete_self on public.user_images;
create policy user_images_delete_self on public.user_images
  for delete to authenticated
  using (user_id = auth.uid());

-- NOTE: per-campaign character writes go through a service-role server
-- action that updates ONLY character_name/avatar_url after verifying
-- membership — so no member-self UPDATE policy is added to
-- campaign_members (that would also expose role / is_dm to self-edits).
