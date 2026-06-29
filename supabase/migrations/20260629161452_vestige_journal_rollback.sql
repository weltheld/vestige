-- =====================================================================
-- Vestige — Journal module ROLLBACK
-- =====================================================================
-- Fully reverses 20260629161452_vestige_journal_init.sql with NO impact on
-- any existing data. Drops children before parents (FK order), then the
-- helper functions, then the additive columns. Idempotent (IF EXISTS).
--
-- Existing votes / polls / users / campaigns / members / storage are NOT
-- touched by any statement here.
--
-- DO NOT run automatically.
-- =====================================================================

-- ---------- new tables: children → parents ----------------------------
-- (Dropping a table also drops its policies, indexes, triggers and the FKs
--  that point INTO it. Order matters because of FK references.)
drop table if exists public.journal_session_revisions;
drop table if exists public.journal_comments;
drop table if exists public.journal_annotations;
drop table if exists public.journal_session_characters;
drop table if exists public.journal_characters;
drop table if exists public.journal_sessions;

-- ---------- helper functions added by the migration -------------------
drop function if exists public.journal_session_campaign(uuid);
drop function if exists public.journal_touch_updated_at();

-- ---------- additive columns ------------------------------------------
-- Safe: nothing in the existing schema references either column.
do $$ begin
  alter table public.campaigns drop constraint if exists campaigns_modules_enabled_chk;
exception when undefined_object then null; end $$;

alter table public.campaigns drop column if exists modules_enabled;
alter table public.profiles  drop column if exists first_name;

-- =====================================================================
-- After this script the schema is identical to the pre-migration state
-- (Council of Days migrations 0001–0005).
-- =====================================================================
