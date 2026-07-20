-- =====================================================================
-- Vestige — shared AI keys across campaigns (ADDITIVE + column swap)
-- =====================================================================
-- Codex AI keys were stored as plaintext columns directly on
-- campaign_ai_settings, one copy per campaign — pasting the same key for
-- a second campaign meant re-typing it, and there was no way to see which
-- campaigns shared a key. This moves keys into a per-user library
-- (user_ai_keys) that campaigns reference by id, so the same key can be
-- linked to many campaigns and its usage is visible.
--
-- Requires 20260712170000_campaign_ai_settings.sql and
-- 20260712190000_campaign_ai_dual_keys.sql to have been run.
-- DO NOT run automatically — apply via the Supabase Dashboard SQL Editor.
-- =====================================================================

create table if not exists public.user_ai_keys (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  provider    text not null check (provider in ('anthropic', 'groq')),
  api_key     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, provider, api_key)
);

alter table public.user_ai_keys enable row level security;

-- Owner-only — a key is only ever visible to the user who added it.
drop policy if exists user_ai_keys_select on public.user_ai_keys;
create policy user_ai_keys_select on public.user_ai_keys
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists user_ai_keys_insert on public.user_ai_keys;
create policy user_ai_keys_insert on public.user_ai_keys
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists user_ai_keys_update on public.user_ai_keys;
create policy user_ai_keys_update on public.user_ai_keys
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists user_ai_keys_delete on public.user_ai_keys;
create policy user_ai_keys_delete on public.user_ai_keys
  for delete to authenticated
  using (user_id = auth.uid());

alter table public.campaign_ai_settings
  add column if not exists anthropic_key_id uuid references public.user_ai_keys(id) on delete set null,
  add column if not exists groq_key_id uuid references public.user_ai_keys(id) on delete set null;

-- Backfill: lift each campaign's existing plaintext key into its creator's
-- key library (deduping identical keys), then point the campaign at it.
insert into public.user_ai_keys (user_id, provider, api_key)
select distinct c.creator_id, 'anthropic', cas.anthropic_key
from public.campaign_ai_settings cas
join public.campaigns c on c.id = cas.campaign_id
where cas.anthropic_key is not null
on conflict (user_id, provider, api_key) do nothing;

insert into public.user_ai_keys (user_id, provider, api_key)
select distinct c.creator_id, 'groq', cas.groq_key
from public.campaign_ai_settings cas
join public.campaigns c on c.id = cas.campaign_id
where cas.groq_key is not null
on conflict (user_id, provider, api_key) do nothing;

update public.campaign_ai_settings cas
set anthropic_key_id = uak.id
from public.campaigns c, public.user_ai_keys uak
where c.id = cas.campaign_id
  and uak.user_id = c.creator_id
  and uak.provider = 'anthropic'
  and uak.api_key = cas.anthropic_key;

update public.campaign_ai_settings cas
set groq_key_id = uak.id
from public.campaigns c, public.user_ai_keys uak
where c.id = cas.campaign_id
  and uak.user_id = c.creator_id
  and uak.provider = 'groq'
  and uak.api_key = cas.groq_key;

alter table public.campaign_ai_settings
  drop column if exists anthropic_key,
  drop column if exists groq_key;

-- =====================================================================
-- End. Rollback: see the matching _rollback.sql.
-- =====================================================================
