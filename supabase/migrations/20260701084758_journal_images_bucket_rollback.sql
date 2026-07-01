-- =====================================================================
-- Vestige — Journal images storage bucket ROLLBACK
-- =====================================================================
-- Reverses 20260701084758_journal_images_bucket.sql. Deletes the bucket's
-- policies, its objects, and the bucket itself. No other bucket/table is
-- touched. DO NOT run automatically.
-- =====================================================================

drop policy if exists journal_images_delete on storage.objects;
drop policy if exists journal_images_update on storage.objects;
drop policy if exists journal_images_insert on storage.objects;
drop policy if exists journal_images_read on storage.objects;

delete from storage.objects where bucket_id = 'journal-images';
delete from storage.buckets where id = 'journal-images';
