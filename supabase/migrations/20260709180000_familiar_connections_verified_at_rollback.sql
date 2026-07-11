-- =====================================================================
-- Vestige — Familiar connection verified_at ROLLBACK
-- =====================================================================
-- Reverses 20260709180000_familiar_connections_verified_at.sql. DO NOT run
-- automatically.
-- =====================================================================

alter table public.familiar_connections
  drop column if exists verified_at;
