-- Rollback for 20260713120000_codex_items_creatures_images.sql
-- NOTE: reverting the kind check will FAIL if any rows use 'item'/'creature'.
-- Reclassify or delete those rows first if you truly need to roll back.

alter table public.npcs
  drop constraint if exists npcs_kind_check;

alter table public.npcs
  add constraint npcs_kind_check
    check (kind in ('person', 'place', 'event'));

alter table public.npcs
  drop column if exists image_url;
