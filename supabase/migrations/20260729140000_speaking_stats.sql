-- Who spoke, and for how long, per session.
--
-- Familiar records one Discord audio track per player, so the transcript is
-- already speaker-tagged without diarization — talk time is a sum over segment
-- durations, and the speaker is the mapped character name where the campaign
-- has one.
--
-- Stored as jsonb on the session rather than as rows: it's a small, fixed
-- snapshot written once by the ingest and read whole by one card. Rows would
-- buy queryability nothing currently asks for, and a join per session page.
--
-- Shape:
--   { "spanSeconds": 12480,
--     "speakers": [ { "name": "DM", "seconds": 4210 }, ... ] }
--
-- Nullable, and absent for every session recorded before this shipped —
-- re-pushing an old session from Familiar backfills it from the transcript
-- kept on disk, with no re-transcription.

alter table public.journal_sessions
  add column if not exists speaking_stats jsonb;

comment on column public.journal_sessions.speaking_stats is
  'Per-speaker talk time from the Familiar transcript: {spanSeconds, speakers:[{name, seconds}]}. Null when the session predates the feature or was written by hand.';
