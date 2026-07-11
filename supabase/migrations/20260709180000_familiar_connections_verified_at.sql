-- =====================================================================
-- Vestige — Familiar connection verification timestamp (ADDITIVE)
-- =====================================================================
-- Lets Familiar prove a pasted endpoint + token actually work (a
-- lightweight ping, see app/api/familiar/ping/route.ts) before any real
-- recap has been sent, so the journal settings page and campaign card can
-- show "Verified" instead of just "Not connected yet" while waiting for
-- the first session.
--
-- Touches nothing existing. DO NOT run automatically — apply on a Supabase
-- branch first, then prod (see the other journal migrations).
-- =====================================================================

alter table public.familiar_connections
  add column if not exists verified_at timestamptz;

-- =====================================================================
-- End. Rollback: see the matching _rollback.sql.
-- =====================================================================
