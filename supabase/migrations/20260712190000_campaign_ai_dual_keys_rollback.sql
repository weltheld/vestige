-- Rollback for 20260712190000_campaign_ai_dual_keys.sql — restores the
-- single-key shape, keeping whichever key was active.
alter table public.campaign_ai_settings
  add column if not exists api_key text;

update public.campaign_ai_settings
  set api_key = case when provider = 'anthropic' then anthropic_key else groq_key end
  where api_key is null;

delete from public.campaign_ai_settings where api_key is null;

alter table public.campaign_ai_settings
  alter column api_key set not null,
  drop column if exists anthropic_key,
  drop column if exists groq_key;
