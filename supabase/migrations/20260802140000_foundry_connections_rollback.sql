-- Rollback for 20260802140000_foundry_connections.sql
--
-- Drops the connection table and its tokens. Imported sheets are untouched:
-- they live in character_sheets and do not reference this table. Re-running
-- the forward migration issues fresh tokens, so every Foundry install that
-- had one must be re-pasted.

drop policy if exists foundry_connections_select on public.foundry_connections;
drop policy if exists foundry_connections_insert on public.foundry_connections;
drop policy if exists foundry_connections_update on public.foundry_connections;
drop policy if exists foundry_connections_delete on public.foundry_connections;

drop table if exists public.foundry_connections;
