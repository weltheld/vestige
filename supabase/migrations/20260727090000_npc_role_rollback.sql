-- Rollback for 20260727090000_npc_role.sql
--
-- Drops the role column. Any roles set since the migration are lost — there
-- is nowhere to put them, since `status` never held that information. The
-- forward migration deliberately left `status` alone, so rolling back
-- restores the previous behaviour exactly.

alter table public.npcs drop column if exists role;
