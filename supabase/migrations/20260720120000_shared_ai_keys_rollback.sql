-- Rollback for 20260720120000_shared_ai_keys.sql

alter table public.campaign_ai_settings
  add column if not exists anthropic_key text,
  add column if not exists groq_key text;

update public.campaign_ai_settings cas
set anthropic_key = uak.api_key
from public.user_ai_keys uak
where uak.id = cas.anthropic_key_id;

update public.campaign_ai_settings cas
set groq_key = uak.api_key
from public.user_ai_keys uak
where uak.id = cas.groq_key_id;

alter table public.campaign_ai_settings
  drop column if exists anthropic_key_id,
  drop column if exists groq_key_id;

drop table if exists public.user_ai_keys;
