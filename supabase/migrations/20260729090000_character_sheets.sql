-- Foundry VTT character sheet imports.
--
-- A player exports their actor from Foundry ("Export Data") and uploads the
-- JSON here; we parse it into a clean shape for display. Vestige is a
-- pass-through display layer, never a rules engine — every derived value
-- (proficiency bonus, spell save DC, encumbrance) is read from what Foundry
-- computed, never recalculated.
--
-- `data` holds the parsed sheet the UI renders. `raw_data` keeps the original
-- export so a later, better parser can re-derive `data` without asking anyone
-- to re-upload — the parse is lossy by design and the export is not.

create table if not exists public.character_sheets (
  id               uuid primary key default gen_random_uuid(),
  campaign_id      uuid not null references public.campaigns(id) on delete cascade,
  -- Foundry's internal actor _id. Scoped to the campaign, not global: the same
  -- actor imported into two campaigns is deliberately two rows, because the
  -- sheet belongs to the campaign it was brought into.
  foundry_actor_id text not null,
  name             text not null,
  data             jsonb not null,
  raw_data         jsonb,
  imported_by      uuid references public.profiles(id) on delete set null,
  imported_at      timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (campaign_id, foundry_actor_id)
);

create index if not exists character_sheets_campaign_idx
  on public.character_sheets (campaign_id);

comment on column public.character_sheets.raw_data is
  'The untouched Foundry export. Kept so the parser can be improved and rerun without a re-upload.';

alter table public.character_sheets enable row level security;

-- Same member-scoped shape as the journal tables: the campaign is on the row,
-- so no SECURITY DEFINER helper is needed to resolve it.
drop policy if exists character_sheets_select on public.character_sheets;
create policy character_sheets_select on public.character_sheets
  for select to authenticated
  using (public.is_campaign_member(campaign_id));

drop policy if exists character_sheets_insert on public.character_sheets;
create policy character_sheets_insert on public.character_sheets
  for insert to authenticated
  with check (public.is_campaign_member(campaign_id));

drop policy if exists character_sheets_update on public.character_sheets;
create policy character_sheets_update on public.character_sheets
  for update to authenticated
  using (public.is_campaign_member(campaign_id))
  with check (public.is_campaign_member(campaign_id));

drop policy if exists character_sheets_delete on public.character_sheets;
create policy character_sheets_delete on public.character_sheets
  for delete to authenticated
  using (public.is_campaign_member(campaign_id));
