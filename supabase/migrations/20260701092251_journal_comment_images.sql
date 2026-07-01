-- =====================================================================
-- Vestige — Journal comment image attachments (ADDITIVE)
-- =====================================================================
-- Adds a nullable image_url to journal_comments so a comment can carry one
-- attached image (stored in the journal-images bucket). Existing rows get
-- NULL — no behaviour change. DO NOT run automatically.
-- =====================================================================

alter table public.journal_comments
  add column if not exists image_url text;
