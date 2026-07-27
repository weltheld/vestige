-- Codex characters get a ROLE instead of a life status.
--
-- `status` (alive/dead/unknown) answered a question nobody was asking: every
-- auto-created entry defaults to 'unknown' and nothing ever sets it, so the
-- codex read "PERSON · UNKNOWN" forever — which looks like a claim about a
-- character's fate when it only meant "unfilled". What's actually worth
-- knowing about a character is what kind of character it is.
--
-- `kind` stays the entity type (person / creature / place / item / event);
-- `role` is orthogonal to it, because a person can be a PC or an NPC and a
-- creature can be a familiar or a monster.
--
-- `status` is deliberately LEFT IN PLACE, unused. It keeps its NOT NULL
-- default so inserts don't need it, and dropping a column is not reversible
-- by a rollback script — see the note in the rollback file.

alter table public.npcs
  add column if not exists role text not null default 'npc'
    check (role in ('pc', 'npc', 'companion'));

comment on column public.npcs.role is
  'Character role: pc (player character), npc, or companion (pet, familiar, mount). Meaningful for kind in (person, creature).';
