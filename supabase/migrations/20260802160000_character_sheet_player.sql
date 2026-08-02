-- =====================================================================
-- Vestige — Allocate an imported sheet to a player (ADDITIVE)
-- =====================================================================
-- A pushed sheet arrives knowing which campaign it belongs to but not whose
-- character it is: the Foundry module authenticates with a campaign token,
-- and Foundry's own ownership is per-install, not per-Vestige-account. So
-- the DM says who each character belongs to, here.
--
-- Nullable on purpose. An unallocated sheet is the normal state right after
-- an import, not an error, and NPCs or retired characters may never be
-- allocated at all.
--
-- on delete set null rather than cascade: a player leaving the table should
-- not delete the character's sheet, which is part of the campaign's record.
--
-- Touches no existing column or policy. DO NOT run automatically.
-- =====================================================================

alter table public.character_sheets
  add column if not exists player_id uuid references public.profiles(id) on delete set null;

comment on column public.character_sheets.player_id is
  'Which campaign member plays this character. Set in Vestige by the DM, not carried in the Foundry export.';

create index if not exists character_sheets_player_idx
  on public.character_sheets (player_id);

-- =====================================================================
-- End. Rollback: see the matching _rollback.sql.
-- =====================================================================
