-- =====================================================================
-- Vestige — Campaign join codes (ADDITIVE)
-- =====================================================================
-- Lets a campaign creator share a short human-friendly code (shown on the
-- Manage Campaign screen) that anyone can type in on the Vestige home
-- screen to join that campaign — an alternate, lower-friction path to the
-- existing magic-link invite. Redemption is done server-side with the
-- service role (see apps/web/app/app/actions.ts), so RLS here only needs
-- to protect the creator's own read/write access to their code.
--
-- Touches nothing existing. DO NOT run automatically — apply on a Supabase
-- branch first, then prod (see the other journal migrations).
-- =====================================================================

create table if not exists public.campaign_join_codes (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  code        text not null unique,
  created_at  timestamptz not null default now()
);

alter table public.campaign_join_codes enable row level security;

drop policy if exists campaign_join_codes_select on public.campaign_join_codes;
create policy campaign_join_codes_select on public.campaign_join_codes
  for select to authenticated
  using (public.is_campaign_creator(campaign_id));

drop policy if exists campaign_join_codes_insert on public.campaign_join_codes;
create policy campaign_join_codes_insert on public.campaign_join_codes
  for insert to authenticated
  with check (public.is_campaign_creator(campaign_id));

drop policy if exists campaign_join_codes_update on public.campaign_join_codes;
create policy campaign_join_codes_update on public.campaign_join_codes
  for update to authenticated
  using (public.is_campaign_creator(campaign_id))
  with check (public.is_campaign_creator(campaign_id));

-- No delete policy: codes live and die with the campaign (on delete cascade).

-- =====================================================================
-- End. Rollback: see the matching _rollback.sql.
-- =====================================================================
