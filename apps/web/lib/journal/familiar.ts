import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@vestige/db";
import { getServiceRoleSupabase } from "@vestige/db/server";
import { WEB_URL } from "./links";

type SB = SupabaseClient<Database>;

/** Where Familiar POSTs recaps. This app's basePath is "/journal", so the
 *  route (app/api/familiar/ingest) lives under it. */
export const FAMILIAR_INGEST_URL = `${WEB_URL}/journal/api/familiar/ingest`;

/** The Familiar landing / download page. */
export const FAMILIAR_DOWNLOAD_URL = "https://dnd-recap-bot.vercel.app";

function newIngestToken() {
  const rand = () => globalThis.crypto.randomUUID().replace(/-/g, "");
  return `fam_${rand()}${rand()}`;
}

export type FamiliarConnection = {
  token: string;
  ingestUrl: string;
  lastRecapAt: string | null;
  recapCount: number;
  verifiedAt: string | null;
};

/**
 * The campaign's Familiar connection for the creator's settings view. Creates
 * the token on first access (idempotent — one row per campaign, creator-only
 * per RLS), so the DM always has a token to paste into Familiar.
 */
export async function getOrCreateFamiliarConnection(
  supabase: SB,
  campaignId: string,
): Promise<FamiliarConnection | null> {
  const { data: existing } = await supabase
    .from("familiar_connections")
    .select("ingest_token, last_recap_at, recap_count, verified_at")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  let row = existing;
  if (!row) {
    const { data: created, error } = await supabase
      .from("familiar_connections")
      .insert({ campaign_id: campaignId, ingest_token: newIngestToken() })
      .select("ingest_token, last_recap_at, recap_count, verified_at")
      .single();
    if (error || !created) return null;
    row = created;
  }

  return {
    token: row.ingest_token,
    ingestUrl: FAMILIAR_INGEST_URL,
    lastRecapAt: row.last_recap_at,
    recapCount: row.recap_count,
    verifiedAt: row.verified_at,
  };
}

export type FamiliarStatus = { connected: boolean; verified: boolean; lastRecapAt: string | null };

/**
 * Non-secret connection status for the campaign page card, readable by any
 * member. The token lives in a creator-only RLS table, so this reads
 * last_recap_at/verified_at with the service role (status only — never the
 * token). `verified` is true once Familiar's lightweight ping has confirmed
 * the endpoint + token work, ahead of any real recap ever being sent.
 */
export async function getFamiliarStatus(campaignId: string): Promise<FamiliarStatus> {
  const admin = getServiceRoleSupabase();
  const { data } = await admin
    .from("familiar_connections")
    .select("last_recap_at, recap_count, verified_at")
    .eq("campaign_id", campaignId)
    .maybeSingle();
  return {
    connected: !!data && data.recap_count > 0,
    verified: !!data?.verified_at,
    lastRecapAt: data?.last_recap_at ?? null,
  };
}
