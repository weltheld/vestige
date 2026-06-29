-- =====================================================================
-- Vestige — Journal: split session notes into four sections (ADDITIVE)
-- =====================================================================
-- The Journal editor stores the recap as four distinct sections. The
-- initial migration (20260629161452_vestige_journal_init.sql) gave
-- journal_sessions a single `summary` column; this adds the other three.
--
-- Additive only: existing rows get NULL for the new columns. `summary`
-- keeps its meaning (the SUMMARY section). Markdown is stored as text.
--
-- Apply on a Supabase branch first, then production. DO NOT run automatically.
-- =====================================================================

alter table public.journal_sessions
  add column if not exists player_characters text,
  add column if not exists npcs             text,
  add column if not exists notes            text;
