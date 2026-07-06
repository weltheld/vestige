-- =====================================================================
-- Vestige — Journal session image gallery ROLLBACK
-- =====================================================================
-- Reverses 20260703120000_journal_session_images.sql. journal_sessions
-- .image_url is untouched (it predates this table). DO NOT run automatically.
-- =====================================================================

drop table if exists public.journal_session_images;
