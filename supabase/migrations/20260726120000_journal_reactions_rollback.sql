-- Rollback for 20260726120000_journal_reactions.sql
drop policy if exists journal_reactions_select on public.journal_reactions;
drop policy if exists journal_reactions_insert on public.journal_reactions;
drop policy if exists journal_reactions_delete on public.journal_reactions;
drop index if exists public.journal_reactions_session_idx;
drop table if exists public.journal_reactions;
