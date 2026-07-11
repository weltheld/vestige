-- =====================================================================
-- Council of Days — per-member table role (DM / player)
-- Run in the Supabase SQL Editor after 0002. Idempotent.
-- =====================================================================

-- A member is either a Dungeon Master (is_dm = true) or a player.
-- Independent of the ownership `role` ('creator' | 'participant').
alter table public.campaign_members
  add column if not exists is_dm boolean not null default false;

-- Existing creators become DMs by default.
update public.campaign_members
   set is_dm = true
 where role = 'creator'
   and is_dm = false;

-- Allow the campaign creator to update member rows (e.g. flip DM/player).
-- Writes also go through the service role, but this keeps RLS consistent.
drop policy if exists members_update on public.campaign_members;
create policy members_update on public.campaign_members
  for update to authenticated
  using (public.is_campaign_creator(campaign_id))
  with check (public.is_campaign_creator(campaign_id));
