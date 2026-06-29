-- =====================================================================
-- Council of Days — initial schema
-- Run this in the Supabase SQL Editor (or via the Supabase CLI).
-- Idempotent where reasonable so re-running is safe.
-- =====================================================================

-- ---------- enums ------------------------------------------------------
do $$ begin
  create type public.campaign_phase as enum ('draft', 'live');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.member_role as enum ('creator', 'participant');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.vote_value as enum ('yes', 'maybe', 'no');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invitation_status as enum ('queued', 'sent', 'joined');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.background_scene as enum ('tavern', 'parchment', 'wine', 'forest');
exception when duplicate_object then null; end $$;

-- ---------- profiles ---------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  character_name  text not null default '',
  display_name    text not null default '',
  avatar_url      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (lower(email));

-- Auto-create a profile row whenever a new auth.users row is inserted.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- campaigns --------------------------------------------------
create table if not exists public.campaigns (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  note              text default '',
  creator_id        uuid not null references auth.users(id) on delete cascade,
  phase             public.campaign_phase not null default 'draft',
  -- ISO weekdays 0=Sun … 6=Sat — default to Mon-Fri
  viable_weekdays   smallint[] not null default array[1,2,3,4,5]::smallint[],
  background        public.background_scene not null default 'parchment',
  created_at        timestamptz not null default now()
);

create index if not exists campaigns_creator_idx on public.campaigns (creator_id);

-- Slug generator: name -> kebab-case + short random suffix, retried on collision.
create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(input, 'campaign')), '[^a-z0-9]+', '-', 'g'))
$$;

create or replace function public.campaigns_set_slug()
returns trigger
language plpgsql
as $$
declare
  base text;
  candidate text;
  i int := 0;
begin
  if new.slug is null or new.slug = '' then
    base := left(public.slugify(new.name), 28);
    if base = '' then base := 'campaign'; end if;
    candidate := base || '-' || substr(md5(random()::text), 1, 4);
    while exists (select 1 from public.campaigns where slug = candidate) and i < 20 loop
      candidate := base || '-' || substr(md5(random()::text), 1, 4);
      i := i + 1;
    end loop;
    new.slug := candidate;
  end if;
  return new;
end;
$$;

drop trigger if exists campaigns_slug_trg on public.campaigns;
create trigger campaigns_slug_trg
  before insert on public.campaigns
  for each row execute function public.campaigns_set_slug();

-- ---------- campaign_members ------------------------------------------
create table if not exists public.campaign_members (
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  user_id      uuid not null references auth.users(id)       on delete cascade,
  role         public.member_role not null default 'participant',
  joined_at    timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

create index if not exists campaign_members_user_idx on public.campaign_members (user_id);

-- ---------- invitations -----------------------------------------------
create table if not exists public.invitations (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete cascade,
  email        text,
  status       public.invitation_status not null default 'queued',
  invited_at   timestamptz not null default now(),
  -- Exactly one of user_id / email must be populated.
  constraint invitations_target_chk check (
    (user_id is not null and email is null)
    or (user_id is null and email is not null)
  )
);

-- Prevent duplicates per campaign.
create unique index if not exists invitations_user_uidx
  on public.invitations (campaign_id, user_id)
  where user_id is not null;

create unique index if not exists invitations_email_uidx
  on public.invitations (campaign_id, lower(email))
  where email is not null;

create index if not exists invitations_user_lookup_idx on public.invitations (user_id);

-- ---------- votes ------------------------------------------------------
create table if not exists public.votes (
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  user_id      uuid not null references auth.users(id)       on delete cascade,
  date         date not null,
  value        public.vote_value not null,
  updated_at   timestamptz not null default now(),
  primary key (campaign_id, user_id, date)
);

create index if not exists votes_campaign_date_idx on public.votes (campaign_id, date);

-- =====================================================================
-- Row-Level Security
-- =====================================================================
alter table public.profiles          enable row level security;
alter table public.campaigns         enable row level security;
alter table public.campaign_members  enable row level security;
alter table public.invitations       enable row level security;
alter table public.votes             enable row level security;

-- ---------- helper: is the current user a member of campaign X? -------
-- SECURITY DEFINER so the function can read campaign_members without
-- triggering the RLS policy on that table (which would recurse).
create or replace function public.is_campaign_member(p_campaign uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.campaign_members
     where campaign_id = p_campaign
       and user_id     = auth.uid()
  );
$$;

create or replace function public.is_campaign_creator(p_campaign uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.campaigns
     where id = p_campaign
       and creator_id = auth.uid()
  );
$$;

-- ---------- profiles policies -----------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------- campaigns policies ----------------------------------------
drop policy if exists campaigns_select_member on public.campaigns;
create policy campaigns_select_member on public.campaigns
  for select to authenticated
  using (public.is_campaign_member(id));

drop policy if exists campaigns_insert_creator on public.campaigns;
create policy campaigns_insert_creator on public.campaigns
  for insert to authenticated
  with check (creator_id = auth.uid());

drop policy if exists campaigns_update_creator on public.campaigns;
create policy campaigns_update_creator on public.campaigns
  for update to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

drop policy if exists campaigns_delete_creator on public.campaigns;
create policy campaigns_delete_creator on public.campaigns
  for delete to authenticated
  using (creator_id = auth.uid());

-- ---------- campaign_members policies ---------------------------------
drop policy if exists members_select on public.campaign_members;
create policy members_select on public.campaign_members
  for select to authenticated
  using (public.is_campaign_member(campaign_id));

-- Creator may add anyone; user may add themselves (used during invite accept).
drop policy if exists members_insert on public.campaign_members;
create policy members_insert on public.campaign_members
  for insert to authenticated
  with check (
    public.is_campaign_creator(campaign_id)
    or user_id = auth.uid()
  );

drop policy if exists members_delete on public.campaign_members;
create policy members_delete on public.campaign_members
  for delete to authenticated
  using (
    public.is_campaign_creator(campaign_id)
    or user_id = auth.uid()
  );

-- ---------- invitations policies --------------------------------------
drop policy if exists invitations_select on public.invitations;
create policy invitations_select on public.invitations
  for select to authenticated
  using (
    public.is_campaign_creator(campaign_id)
    or user_id = auth.uid()
    or lower(coalesce(email, '')) = lower(auth.email())
  );

drop policy if exists invitations_insert on public.invitations;
create policy invitations_insert on public.invitations
  for insert to authenticated
  with check (public.is_campaign_creator(campaign_id));

drop policy if exists invitations_delete on public.invitations;
create policy invitations_delete on public.invitations
  for delete to authenticated
  using (public.is_campaign_creator(campaign_id));

-- Invitee may flip status to 'joined' when accepting.
drop policy if exists invitations_update_invitee on public.invitations;
create policy invitations_update_invitee on public.invitations
  for update to authenticated
  using (
    user_id = auth.uid()
    or lower(coalesce(email, '')) = lower(auth.email())
  )
  with check (
    user_id = auth.uid()
    or lower(coalesce(email, '')) = lower(auth.email())
  );

-- ---------- votes policies --------------------------------------------
drop policy if exists votes_select_member on public.votes;
create policy votes_select_member on public.votes
  for select to authenticated
  using (public.is_campaign_member(campaign_id));

drop policy if exists votes_insert_self on public.votes;
create policy votes_insert_self on public.votes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_campaign_member(campaign_id)
  );

drop policy if exists votes_update_self on public.votes;
create policy votes_update_self on public.votes
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists votes_delete_self on public.votes;
create policy votes_delete_self on public.votes
  for delete to authenticated
  using (user_id = auth.uid());

-- =====================================================================
-- Accept-invite RPC
-- =====================================================================
-- Atomically: mark invitation 'joined' and insert the membership row.
create or replace function public.accept_invitation(p_invitation uuid)
returns public.campaign_members
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invitations%rowtype;
  result public.campaign_members%rowtype;
  caller_email text := auth.email();
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'must be signed in';
  end if;

  select * into inv from public.invitations where id = p_invitation;
  if not found then
    raise exception 'invitation not found';
  end if;

  if inv.user_id is not null and inv.user_id <> caller_id then
    raise exception 'invitation belongs to another user';
  end if;
  if inv.email is not null and lower(inv.email) <> lower(caller_email) then
    raise exception 'invitation belongs to a different email';
  end if;

  insert into public.campaign_members (campaign_id, user_id, role)
  values (inv.campaign_id, caller_id, 'participant')
  on conflict (campaign_id, user_id) do nothing
  returning * into result;

  update public.invitations
     set status = 'joined',
         user_id = caller_id
   where id = p_invitation;

  return result;
end;
$$;

grant execute on function public.accept_invitation(uuid) to authenticated;
