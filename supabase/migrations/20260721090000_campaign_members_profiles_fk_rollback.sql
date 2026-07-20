-- Rollback for 20260721090000_campaign_members_profiles_fk.sql
alter table public.campaign_members
  drop constraint if exists campaign_members_user_id_profiles_fkey;

notify pgrst, 'reload schema';
