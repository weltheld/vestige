-- Paragraph reactions ("emotes") for journal sessions.
--
-- Anchored the same way annotations are (`${sectionKey}:${index}`), so a
-- reaction and a comment on the same paragraph agree on what they point at.
-- One row per (paragraph, person, emoji): the primary key makes a reaction
-- idempotent, so toggling is an insert or a delete and a double-click can
-- never double-count.

create table if not exists public.journal_reactions (
  session_id uuid not null references public.journal_sessions(id) on delete cascade,
  anchor     text not null,                -- matches journal_annotations.anchor
  emoji      text not null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, anchor, user_id, emoji)
);

-- The read path loads every reaction for one session at a time.
create index if not exists journal_reactions_session_idx
  on public.journal_reactions (session_id);

alter table public.journal_reactions enable row level security;

-- Members of the campaign may read all reactions on its sessions. Campaign
-- membership is resolved through the SECURITY DEFINER helper so the policy
-- doesn't recurse into journal_sessions' own RLS.
drop policy if exists journal_reactions_select on public.journal_reactions;
create policy journal_reactions_select on public.journal_reactions
  for select to authenticated
  using (public.is_campaign_member(public.journal_session_campaign(session_id)));

-- You may only add or remove your OWN reaction, and only on a session in a
-- campaign you belong to.
drop policy if exists journal_reactions_insert on public.journal_reactions;
create policy journal_reactions_insert on public.journal_reactions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_campaign_member(public.journal_session_campaign(session_id))
  );

drop policy if exists journal_reactions_delete on public.journal_reactions;
create policy journal_reactions_delete on public.journal_reactions
  for delete to authenticated
  using (
    user_id = auth.uid()
    and public.is_campaign_member(public.journal_session_campaign(session_id))
  );
