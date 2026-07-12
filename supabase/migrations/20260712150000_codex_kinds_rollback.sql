-- =====================================================================
-- Vestige — Codex entity kinds ROLLBACK
-- =====================================================================
-- Reverses 20260712150000_codex_kinds.sql. DO NOT run automatically.
-- =====================================================================

alter table public.npcs drop column if exists kind;
