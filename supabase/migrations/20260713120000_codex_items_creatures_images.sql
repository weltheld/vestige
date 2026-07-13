-- =====================================================================
-- Vestige — Codex: item & creature kinds + entry images (ADDITIVE)
-- =====================================================================
-- Extends the codex beyond person/place/event to also track items (loot,
-- artifacts) and creatures (monsters, beasts), and lets any entry carry an
-- image. Both changes are additive — existing rows keep their kind and get
-- a null image.
--
-- Touches nothing destructively. DO NOT run automatically — apply on a
-- Supabase branch first, then prod (see the other codex migrations).
-- =====================================================================

alter table public.npcs
  drop constraint if exists npcs_kind_check;

alter table public.npcs
  add constraint npcs_kind_check
    check (kind in ('person', 'place', 'event', 'item', 'creature'));

alter table public.npcs
  add column if not exists image_url text;

-- =====================================================================
-- End. Rollback: see the matching _rollback.sql.
-- =====================================================================
