-- =====================================================================
-- Vestige — Journal module init  (ADDITIVE / NON-DESTRUCTIVE)
-- =====================================================================
-- Promotes the existing Council of Days project to the Vestige platform DB.
-- Adds:  campaigns.modules_enabled, profiles.first_name, and the journal_*
-- tables + RLS.  Touches NOTHING existing (votes, polls, campaigns, members,
-- users, storage all unchanged).
--
-- Style mirrors the CoD migrations: idempotent (IF NOT EXISTS / guarded DO
-- blocks / drop-then-create policies) so re-running is safe.
--
-- Confirmed decisions (see docs/supabase-migration.md §8):
--   1. journal_ prefix on all new tables (avoids clash with campaign_sessions)
--   2. profiles.first_name added (additive)
--   3. RLS = any campaign MEMBER may write; DM/player gating is in the app
--   + jsonb before/after on revisions; reuse `avatars` bucket; PC↔member link deferred
--
-- DO NOT run automatically. Apply on a Supabase branch first (plan §6), then prod.
-- =====================================================================

-- =====================================================================
-- 1. Additive columns on existing tables
-- =====================================================================

-- 1.1 campaigns.modules_enabled — existing campaigns back-fill to Calendar-only,
--     preserving current behaviour exactly.
alter table public.campaigns
  add column if not exists modules_enabled jsonb not null
    default '{"calendar": true, "journal": false}'::jsonb;

-- Guarded: both keys must be booleans.
do $$ begin
  alter table public.campaigns
    add constraint campaigns_modules_enabled_chk check (
      jsonb_typeof(modules_enabled -> 'calendar') = 'boolean'
      and jsonb_typeof(modules_enabled -> 'journal') = 'boolean'
    );
exception when duplicate_object then null; end $$;

-- 1.2 profiles.first_name — nullable, no default; existing rows become NULL.
alter table public.profiles
  add column if not exists first_name text;

-- =====================================================================
-- 2. Helper: maintain updated_at on journal_sessions
-- =====================================================================
-- (The journal_session_campaign() helper references journal_sessions, so it
--  is defined in §4 AFTER the tables exist — Postgres validates SQL function
--  bodies at CREATE time with check_function_bodies on.)
create or replace function public.journal_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =====================================================================
-- 3. New Journal tables
-- =====================================================================

-- 3.1 journal_sessions  (brief: sessions)
create table if not exists public.journal_sessions (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title       text not null,
  date        date,
  summary     text,
  image_url   text,
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);
create index if not exists journal_sessions_campaign_date_idx
  on public.journal_sessions (campaign_id, date desc);

drop trigger if exists journal_sessions_touch on public.journal_sessions;
create trigger journal_sessions_touch
  before update on public.journal_sessions
  for each row execute function public.journal_touch_updated_at();

-- 3.2 journal_characters  (brief: characters)
create table if not exists public.journal_characters (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  name         text not null,
  role         text not null check (role in ('PC', 'NPC')),
  portrait_url text,
  bio          text,
  created_at   timestamptz not null default now()
);
create index if not exists journal_characters_campaign_idx
  on public.journal_characters (campaign_id);

-- 3.3 journal_session_characters  (brief: session_characters)
create table if not exists public.journal_session_characters (
  session_id   uuid not null references public.journal_sessions(id)  on delete cascade,
  character_id uuid not null references public.journal_characters(id) on delete cascade,
  primary key (session_id, character_id)
);
create index if not exists journal_session_characters_character_idx
  on public.journal_session_characters (character_id);

-- 3.4 journal_annotations  (brief: annotations)
create table if not exists public.journal_annotations (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.journal_sessions(id) on delete cascade,
  anchor     text not null,                -- text reference or block id
  body       text not null,
  author_id  uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists journal_annotations_session_idx
  on public.journal_annotations (session_id);

-- 3.5 journal_comments  (brief: comments)
create table if not exists public.journal_comments (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.journal_sessions(id) on delete cascade,
  section_anchor    text,
  body              text not null,
  author_id         uuid not null references auth.users(id) on delete cascade,
  parent_comment_id uuid references public.journal_comments(id) on delete cascade,
  created_at        timestamptz not null default now()
);
create index if not exists journal_comments_session_idx
  on public.journal_comments (session_id);
create index if not exists journal_comments_parent_idx
  on public.journal_comments (parent_comment_id);

-- 3.6 journal_session_revisions  (brief: session_revisions) — the Change Log
create table if not exists public.journal_session_revisions (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.journal_sessions(id) on delete cascade,
  author_id    uuid not null references auth.users(id) on delete cascade,
  action       text not null check (action in (
                 'created', 'edited', 'commented',
                 'annotated', 'image_added', 'character_added')),
  before_value jsonb,
  after_value  jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists journal_session_revisions_session_idx
  on public.journal_session_revisions (session_id, created_at desc);

-- =====================================================================
-- 4. Row-Level Security
-- =====================================================================

-- Helper: resolve a journal session's campaign (SECURITY DEFINER). Defined
-- here, after journal_sessions exists, so its SQL body validates. Lets the
-- child-table policies check membership without recursive RLS on
-- journal_sessions. Mirrors the existing is_campaign_member/creator helpers.
create or replace function public.journal_session_campaign(p_session uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select campaign_id from public.journal_sessions where id = p_session;
$$;

alter table public.journal_sessions            enable row level security;
alter table public.journal_characters          enable row level security;
alter table public.journal_session_characters  enable row level security;
alter table public.journal_annotations         enable row level security;
alter table public.journal_comments            enable row level security;
alter table public.journal_session_revisions   enable row level security;

-- ---------- journal_sessions (direct campaign_id) ---------------------
drop policy if exists journal_sessions_select on public.journal_sessions;
create policy journal_sessions_select on public.journal_sessions
  for select to authenticated
  using (public.is_campaign_member(campaign_id));

drop policy if exists journal_sessions_insert on public.journal_sessions;
create policy journal_sessions_insert on public.journal_sessions
  for insert to authenticated
  with check (public.is_campaign_member(campaign_id) and created_by = auth.uid());

drop policy if exists journal_sessions_update on public.journal_sessions;
create policy journal_sessions_update on public.journal_sessions
  for update to authenticated
  using (public.is_campaign_member(campaign_id))
  with check (public.is_campaign_member(campaign_id));

drop policy if exists journal_sessions_delete on public.journal_sessions;
create policy journal_sessions_delete on public.journal_sessions
  for delete to authenticated
  using (public.is_campaign_member(campaign_id));

-- ---------- journal_characters (direct campaign_id) -------------------
drop policy if exists journal_characters_select on public.journal_characters;
create policy journal_characters_select on public.journal_characters
  for select to authenticated
  using (public.is_campaign_member(campaign_id));

drop policy if exists journal_characters_insert on public.journal_characters;
create policy journal_characters_insert on public.journal_characters
  for insert to authenticated
  with check (public.is_campaign_member(campaign_id));

drop policy if exists journal_characters_update on public.journal_characters;
create policy journal_characters_update on public.journal_characters
  for update to authenticated
  using (public.is_campaign_member(campaign_id))
  with check (public.is_campaign_member(campaign_id));

drop policy if exists journal_characters_delete on public.journal_characters;
create policy journal_characters_delete on public.journal_characters
  for delete to authenticated
  using (public.is_campaign_member(campaign_id));

-- ---------- journal_session_characters (via parent session) -----------
drop policy if exists journal_session_characters_select on public.journal_session_characters;
create policy journal_session_characters_select on public.journal_session_characters
  for select to authenticated
  using (public.is_campaign_member(public.journal_session_campaign(session_id)));

drop policy if exists journal_session_characters_insert on public.journal_session_characters;
create policy journal_session_characters_insert on public.journal_session_characters
  for insert to authenticated
  with check (public.is_campaign_member(public.journal_session_campaign(session_id)));

drop policy if exists journal_session_characters_delete on public.journal_session_characters;
create policy journal_session_characters_delete on public.journal_session_characters
  for delete to authenticated
  using (public.is_campaign_member(public.journal_session_campaign(session_id)));

-- ---------- journal_annotations (members read; authors edit own) ------
drop policy if exists journal_annotations_select on public.journal_annotations;
create policy journal_annotations_select on public.journal_annotations
  for select to authenticated
  using (public.is_campaign_member(public.journal_session_campaign(session_id)));

drop policy if exists journal_annotations_insert on public.journal_annotations;
create policy journal_annotations_insert on public.journal_annotations
  for insert to authenticated
  with check (
    public.is_campaign_member(public.journal_session_campaign(session_id))
    and author_id = auth.uid()
  );

drop policy if exists journal_annotations_update on public.journal_annotations;
create policy journal_annotations_update on public.journal_annotations
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists journal_annotations_delete on public.journal_annotations;
create policy journal_annotations_delete on public.journal_annotations
  for delete to authenticated
  using (author_id = auth.uid());

-- ---------- journal_comments (members read; authors edit own) ---------
drop policy if exists journal_comments_select on public.journal_comments;
create policy journal_comments_select on public.journal_comments
  for select to authenticated
  using (public.is_campaign_member(public.journal_session_campaign(session_id)));

drop policy if exists journal_comments_insert on public.journal_comments;
create policy journal_comments_insert on public.journal_comments
  for insert to authenticated
  with check (
    public.is_campaign_member(public.journal_session_campaign(session_id))
    and author_id = auth.uid()
  );

drop policy if exists journal_comments_update on public.journal_comments;
create policy journal_comments_update on public.journal_comments
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists journal_comments_delete on public.journal_comments;
create policy journal_comments_delete on public.journal_comments
  for delete to authenticated
  using (author_id = auth.uid());

-- ---------- journal_session_revisions (append-only change log) --------
-- Members may read and append. NO update/delete policy => immutable log.
drop policy if exists journal_session_revisions_select on public.journal_session_revisions;
create policy journal_session_revisions_select on public.journal_session_revisions
  for select to authenticated
  using (public.is_campaign_member(public.journal_session_campaign(session_id)));

drop policy if exists journal_session_revisions_insert on public.journal_session_revisions;
create policy journal_session_revisions_insert on public.journal_session_revisions
  for insert to authenticated
  with check (
    public.is_campaign_member(public.journal_session_campaign(session_id))
    and author_id = auth.uid()
  );

-- =====================================================================
-- End of Vestige Journal init.  Rollback: see the matching _rollback.sql.
-- =====================================================================
