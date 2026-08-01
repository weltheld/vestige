-- Rollback: Foundry character sheet imports.
--
-- Destructive: this drops every imported sheet, including the raw_data copies
-- of the original exports. Players would have to re-export from Foundry and
-- upload again. Nothing else references this table, so the drop is clean.

drop policy if exists character_sheets_select on public.character_sheets;
drop policy if exists character_sheets_insert on public.character_sheets;
drop policy if exists character_sheets_update on public.character_sheets;
drop policy if exists character_sheets_delete on public.character_sheets;

drop index if exists public.character_sheets_campaign_idx;

drop table if exists public.character_sheets;
