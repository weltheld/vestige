-- Rollback: per-session talk-time stats.
--
-- Destructive in the sense that the stored snapshots are lost, but not in any
-- way that matters: they're derived data, and re-pushing a session from
-- Familiar recomputes them from the transcript on disk.

alter table public.journal_sessions
  drop column if exists speaking_stats;
