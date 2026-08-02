-- Rollback: character artwork bucket.
--
-- Destructive: dropping the bucket deletes every copied image. The sheets
-- themselves are unaffected — they fall back to the lettered placeholder, and
-- re-running the artwork step restores them from the player's Foundry folder.

drop policy if exists character_art_read on storage.objects;
drop policy if exists character_art_insert on storage.objects;
drop policy if exists character_art_update on storage.objects;
drop policy if exists character_art_delete on storage.objects;

delete from storage.objects where bucket_id = 'character-art';
delete from storage.buckets where id = 'character-art';
