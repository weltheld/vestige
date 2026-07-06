-- =====================================================================
-- Vestige — Journal session image gallery (ADDITIVE)
-- =====================================================================
-- A session can now hold more than one image. journal_sessions.image_url
-- keeps meaning exactly what it already did — "the session image" shown at
-- the hero/highest level — but is now just a pointer into this gallery
-- table rather than the only image a session can have. Existing sessions'
-- single image_url is backfilled as their first gallery row so nothing is
-- lost. DO NOT run automatically — apply on a Supabase branch first, then
-- prod (see supabase/migrations conventions).
-- =====================================================================

create table if not exists public.journal_session_images (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.journal_sessions(id) on delete cascade,
  url        text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists journal_session_images_session_idx
  on public.journal_session_images (session_id, created_at);

-- Backfill: every existing session with an image_url gets that image as its
-- first gallery row (idempotent — skipped if already present).
insert into public.journal_session_images (session_id, url, created_by, created_at)
select s.id, s.image_url, s.created_by, s.created_at
from public.journal_sessions s
where s.image_url is not null
  and not exists (
    select 1 from public.journal_session_images i
    where i.session_id = s.id and i.url = s.image_url
  );

alter table public.journal_session_images enable row level security;

drop policy if exists journal_session_images_select on public.journal_session_images;
create policy journal_session_images_select on public.journal_session_images
  for select to authenticated
  using (public.is_campaign_member(public.journal_session_campaign(session_id)));

drop policy if exists journal_session_images_insert on public.journal_session_images;
create policy journal_session_images_insert on public.journal_session_images
  for insert to authenticated
  with check (
    public.is_campaign_member(public.journal_session_campaign(session_id))
    and created_by = auth.uid()
  );

drop policy if exists journal_session_images_delete on public.journal_session_images;
create policy journal_session_images_delete on public.journal_session_images
  for delete to authenticated
  using (public.is_campaign_member(public.journal_session_campaign(session_id)));

-- =====================================================================
-- End. Rollback: see the matching _rollback.sql.
-- =====================================================================
