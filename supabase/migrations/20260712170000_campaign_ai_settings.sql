-- =====================================================================
-- Vestige — per-campaign AI provider key for Codex summaries (ADDITIVE)
-- =====================================================================
-- Lets each campaign creator bring their own Anthropic or Groq API key
-- for the Codex "Summarize from sessions" feature, instead of relying on
-- a single deployment-wide env var. The key is a secret: creator-only
-- RLS, same pattern as familiar_connections.
--
-- Touches nothing existing. DO NOT run automatically — apply via the
-- Supabase Dashboard SQL Editor (see the other journal migrations).
-- =====================================================================

create table if not exists public.campaign_ai_settings (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  provider    text not null check (provider in ('anthropic', 'groq')),
  api_key     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.campaign_ai_settings enable row level security;

-- The key is a secret — only the campaign creator may read or manage it.
drop policy if exists campaign_ai_settings_select on public.campaign_ai_settings;
create policy campaign_ai_settings_select on public.campaign_ai_settings
  for select to authenticated
  using (public.is_campaign_creator(campaign_id));

drop policy if exists campaign_ai_settings_insert on public.campaign_ai_settings;
create policy campaign_ai_settings_insert on public.campaign_ai_settings
  for insert to authenticated
  with check (public.is_campaign_creator(campaign_id));

drop policy if exists campaign_ai_settings_update on public.campaign_ai_settings;
create policy campaign_ai_settings_update on public.campaign_ai_settings
  for update to authenticated
  using (public.is_campaign_creator(campaign_id))
  with check (public.is_campaign_creator(campaign_id));

drop policy if exists campaign_ai_settings_delete on public.campaign_ai_settings;
create policy campaign_ai_settings_delete on public.campaign_ai_settings
  for delete to authenticated
  using (public.is_campaign_creator(campaign_id));

-- =====================================================================
-- End. Rollback: see the matching _rollback.sql.
-- =====================================================================
