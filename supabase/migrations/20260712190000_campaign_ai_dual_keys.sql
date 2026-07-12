-- =====================================================================
-- Vestige — store BOTH AI provider keys per campaign (ADDITIVE-ish)
-- =====================================================================
-- Replaces the single api_key column on campaign_ai_settings with one
-- column per provider (anthropic_key / groq_key). The existing `provider`
-- column now means "which provider is ACTIVE for summaries". Any key
-- saved under the old single-column shape is preserved by copying it
-- into its provider's column before the old column is dropped.
--
-- Requires 20260712170000_campaign_ai_settings.sql to have been run.
-- DO NOT run automatically — apply via the Supabase Dashboard SQL Editor.
-- =====================================================================

alter table public.campaign_ai_settings
  add column if not exists anthropic_key text,
  add column if not exists groq_key text;

update public.campaign_ai_settings
  set anthropic_key = api_key
  where provider = 'anthropic' and anthropic_key is null;

update public.campaign_ai_settings
  set groq_key = api_key
  where provider = 'groq' and groq_key is null;

alter table public.campaign_ai_settings
  drop column if exists api_key;

-- =====================================================================
-- End. Rollback: see the matching _rollback.sql.
-- =====================================================================
