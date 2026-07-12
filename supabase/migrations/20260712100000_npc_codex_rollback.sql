-- =====================================================================
-- Vestige — NPC Codex ROLLBACK
-- =====================================================================
-- Reverses 20260712100000_npc_codex.sql. DO NOT run automatically.
-- =====================================================================

drop table if exists public.npc_mentions;
drop table if exists public.npcs;
drop function if exists public.npc_campaign(uuid);
