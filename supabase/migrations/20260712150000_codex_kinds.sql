-- =====================================================================
-- Vestige — Codex entity kinds (ADDITIVE)
-- =====================================================================
-- The codex grows beyond NPCs: entries are now people, places, or
-- events. Existing rows default to 'person' (they were all NPCs).
--
-- Touches nothing existing. DO NOT run automatically — apply on a Supabase
-- branch first, then prod (see the other journal migrations).
-- =====================================================================

alter table public.npcs
  add column if not exists kind text not null default 'person'
    check (kind in ('person', 'place', 'event'));

-- =====================================================================
-- End. Rollback: see the matching _rollback.sql.
-- =====================================================================
