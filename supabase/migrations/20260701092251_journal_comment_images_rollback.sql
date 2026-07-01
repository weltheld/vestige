-- =====================================================================
-- Vestige — Journal comment image attachments ROLLBACK
-- =====================================================================
-- Reverses 20260701092251_journal_comment_images.sql. Safe: nothing else
-- references this column. DO NOT run automatically.
-- =====================================================================

alter table public.journal_comments drop column if exists image_url;
