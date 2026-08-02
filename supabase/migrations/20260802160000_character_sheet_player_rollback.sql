-- Rollback for 20260802160000_character_sheet_player.sql
--
-- Drops the allocation. Sheets themselves are untouched; every character
-- simply becomes unallocated again.

drop index if exists public.character_sheets_player_idx;

alter table public.character_sheets
  drop column if exists player_id;
