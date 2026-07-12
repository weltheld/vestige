-- =====================================================================
-- Vestige — NPC Codex (ADDITIVE)
-- =====================================================================
-- Per-campaign NPC records plus mention rows linking NPCs to the journal
-- sessions that reference them (the journal editor writes mentions as
-- markdown links "[Name](codex:<npc-id>)"; the save action diffs those
-- against npc_mentions).
--
-- Touches nothing existing. DO NOT run automatically — apply on a Supabase
-- branch first, then prod (see the other journal migrations).
-- =====================================================================

create table if not exists public.npcs (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name        text not null,
  summary     text,
  status      text not null default 'unknown' check (status in ('alive', 'dead', 'unknown')),
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists npcs_campaign_idx on public.npcs (campaign_id);

create table if not exists public.npc_mentions (
  npc_id     uuid not null references public.npcs(id) on delete cascade,
  session_id uuid not null references public.journal_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (npc_id, session_id)
);

create index if not exists npc_mentions_session_idx on public.npc_mentions (session_id);

-- Helper: resolve an NPC's campaign (SECURITY DEFINER), so npc_mentions
-- policies can check membership without recursive RLS on npcs. Mirrors
-- journal_session_campaign.
create or replace function public.npc_campaign(p_npc uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select campaign_id from public.npcs where id = p_npc;
$$;

alter table public.npcs         enable row level security;
alter table public.npc_mentions enable row level security;

-- npcs: same member-scoped pattern as journal_sessions.
drop policy if exists npcs_select on public.npcs;
create policy npcs_select on public.npcs
  for select to authenticated
  using (public.is_campaign_member(campaign_id));

drop policy if exists npcs_insert on public.npcs;
create policy npcs_insert on public.npcs
  for insert to authenticated
  with check (public.is_campaign_member(campaign_id));

drop policy if exists npcs_update on public.npcs;
create policy npcs_update on public.npcs
  for update to authenticated
  using (public.is_campaign_member(campaign_id))
  with check (public.is_campaign_member(campaign_id));

drop policy if exists npcs_delete on public.npcs;
create policy npcs_delete on public.npcs
  for delete to authenticated
  using (public.is_campaign_member(campaign_id));

-- npc_mentions: membership via the session's campaign; insert additionally
-- requires the NPC and the session to belong to the SAME campaign — a
-- pasted mention of another campaign's NPC must not create a row.
drop policy if exists npc_mentions_select on public.npc_mentions;
create policy npc_mentions_select on public.npc_mentions
  for select to authenticated
  using (public.is_campaign_member(public.journal_session_campaign(session_id)));

drop policy if exists npc_mentions_insert on public.npc_mentions;
create policy npc_mentions_insert on public.npc_mentions
  for insert to authenticated
  with check (
    public.is_campaign_member(public.journal_session_campaign(session_id))
    and public.npc_campaign(npc_id) = public.journal_session_campaign(session_id)
  );

drop policy if exists npc_mentions_delete on public.npc_mentions;
create policy npc_mentions_delete on public.npc_mentions
  for delete to authenticated
  using (public.is_campaign_member(public.journal_session_campaign(session_id)));

-- =====================================================================
-- End. Rollback: see the matching _rollback.sql.
-- =====================================================================
