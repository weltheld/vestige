-- =====================================================================
-- Vestige — FK from campaign_members.user_id to profiles(id) (ADDITIVE)
-- =====================================================================
-- campaign_members.user_id has only ever referenced auth.users(id) (see
-- migrations-calendar-legacy/0001_init.sql). PostgREST embedding
-- (`.select("...profiles(...)")`, used by getCampaignSettings for the
-- Players tab) requires an actual FK constraint between the two tables to
-- resolve the join — without it, every request fails with:
--   "Could not find a relationship between 'campaign_members' and
--    'profiles' in the schema cache"
-- Other tables (e.g. journal_sessions.created_by) already FK straight to
-- profiles(id); this brings campaign_members in line. Guarded so it's safe
-- to run even if the constraint (or an equivalent) already exists.
--
-- DO NOT run automatically — apply via the Supabase Dashboard SQL Editor.
-- =====================================================================

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'campaign_members_user_id_profiles_fkey'
  ) then
    alter table public.campaign_members
      add constraint campaign_members_user_id_profiles_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

-- Force PostgREST to pick up the new relationship immediately rather than
-- waiting for its next scheduled schema-cache refresh.
notify pgrst, 'reload schema';

-- =====================================================================
-- End. Rollback: see the matching _rollback.sql.
-- =====================================================================
