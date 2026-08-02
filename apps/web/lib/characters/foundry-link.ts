import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@vestige/db";
import { getServiceRoleSupabase } from "@vestige/db/server";
import { WEB_URL } from "@/lib/journal/links";

type SB = SupabaseClient<Database>;

/** What the DM pastes into the Foundry module's settings. The module appends
 *  /ping, /ingest and /art itself, so one field covers all three. */
export const FOUNDRY_API_BASE = `${WEB_URL}/characters/api/foundry`;

function newIngestToken() {
  const rand = () => globalThis.crypto.randomUUID().replace(/-/g, "");
  return `fnd_${rand()}${rand()}`;
}

export type FoundryConnection = {
  token: string;
  apiBase: string;
  lastImportAt: string | null;
  importCount: number;
  verifiedAt: string | null;
};

/**
 * The campaign's Foundry connection for the creator's view. Creates the token
 * on first access (idempotent — one row per campaign, creator-only per RLS),
 * so there is always something to paste into Foundry.
 *
 * Deliberately a separate token from the Familiar one: they authorize
 * different things (a session recap versus a character sheet plus artwork
 * uploads), and revoking one should not silence the other.
 */
export async function getOrCreateFoundryConnection(
  supabase: SB,
  campaignId: string,
): Promise<FoundryConnection | null> {
  const { data: existing } = await supabase
    .from("foundry_connections")
    .select("ingest_token, last_import_at, import_count, verified_at")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  let row = existing;
  if (!row) {
    const { data: created, error } = await supabase
      .from("foundry_connections")
      .insert({ campaign_id: campaignId, ingest_token: newIngestToken() })
      .select("ingest_token, last_import_at, import_count, verified_at")
      .single();
    if (error || !created) return null;
    row = created;
  }

  return {
    token: row.ingest_token,
    apiBase: FOUNDRY_API_BASE,
    lastImportAt: row.last_import_at,
    importCount: row.import_count,
    verifiedAt: row.verified_at,
  };
}

/** Issue a new token, invalidating the old one. The only recovery when a
 *  token leaks, and the reason the card offers it rather than delete+recreate
 *  (which would lose the import counters). */
export async function rotateFoundryToken(
  supabase: SB,
  campaignId: string,
): Promise<FoundryConnection | null> {
  const { data, error } = await supabase
    .from("foundry_connections")
    .update({ ingest_token: newIngestToken(), verified_at: null })
    .eq("campaign_id", campaignId)
    .select("ingest_token, last_import_at, import_count, verified_at")
    .maybeSingle();
  if (error || !data) return null;
  return {
    token: data.ingest_token,
    apiBase: FOUNDRY_API_BASE,
    lastImportAt: data.last_import_at,
    importCount: data.import_count,
    verifiedAt: data.verified_at,
  };
}

export type FoundryStatus = {
  connected: boolean;
  verified: boolean;
  lastImportAt: string | null;
};

/** Non-secret status for any campaign member. The token lives in a
 *  creator-only table, so this reads the counters with the service role —
 *  status only, never the token. */
export async function getFoundryStatus(campaignId: string): Promise<FoundryStatus> {
  const admin = getServiceRoleSupabase();
  const { data } = await admin
    .from("foundry_connections")
    .select("last_import_at, import_count, verified_at")
    .eq("campaign_id", campaignId)
    .maybeSingle();
  return {
    connected: !!data && data.import_count > 0,
    verified: !!data?.verified_at,
    lastImportAt: data?.last_import_at ?? null,
  };
}
