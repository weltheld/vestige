-- =====================================================================
-- Vestige — track each user's last-interacted campaign (ADDITIVE)
-- =====================================================================
-- Powers the header campaign selector's default pre-selection across the
-- platform: nullable, no default — existing rows are unaffected. Set to
-- NULL (not deleted) if the referenced campaign is removed, so the app's
-- own fallback logic (most-recently-joined campaign, then an empty state)
-- takes over cleanly. DO NOT run automatically.
-- =====================================================================

alter table public.profiles
  add column if not exists last_campaign_id uuid references public.campaigns(id) on delete set null;

create index if not exists profiles_last_campaign_id_idx
  on public.profiles (last_campaign_id);
