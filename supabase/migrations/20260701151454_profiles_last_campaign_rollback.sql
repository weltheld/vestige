-- =====================================================================
-- Vestige — profiles.last_campaign_id ROLLBACK
-- =====================================================================
-- Reverses 20260701151454_profiles_last_campaign.sql. Safe: nothing else
-- references this column. DO NOT run automatically.
-- =====================================================================

drop index if exists public.profiles_last_campaign_id_idx;
alter table public.profiles drop column if exists last_campaign_id;
