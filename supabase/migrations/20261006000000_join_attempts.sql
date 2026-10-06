-- =====================================================================
-- Vestige — failed join-code attempts, for rate limiting (ADDITIVE)
-- =====================================================================
-- Join codes are short, so redeeming them needs a throttle. Each wrong
-- code (or wrong code on a campaign link) writes a row; the app refuses
-- further attempts from that user after 10 misses in 15 minutes.
-- Service-role only: RLS is on with no policies, so no client can read or
-- write it. Apply by hand in the Supabase SQL editor (see conventions).
-- Until applied, the app logs an error and does not throttle.
-- =====================================================================

create table if not exists public.join_attempts (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists join_attempts_user_created_idx
  on public.join_attempts (user_id, created_at desc);

alter table public.join_attempts enable row level security;
