-- Rollback for 20260802200000_character_art_bucket_owner.sql
--
-- Drops the write policies and the bucket. Every stored image goes with it,
-- and sheets keep art maps pointing at URLs that no longer resolve — pushing
-- again from Foundry with "Re-send all artwork" repopulates them.

drop policy if exists character_art_read on storage.objects;
drop policy if exists character_art_insert on storage.objects;
drop policy if exists character_art_update on storage.objects;
drop policy if exists character_art_delete on storage.objects;

delete from storage.objects where bucket_id = 'character-art';
delete from storage.buckets where id = 'character-art';
