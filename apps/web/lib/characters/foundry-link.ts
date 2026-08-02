import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@vestige/db";
import { WEB_URL } from "@/lib/journal/links";

type SB = SupabaseClient<Database>;

/** What gets pasted into the Foundry module. The module appends /ping,
 *  /ingest and /art itself, so one field covers all three. */
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
 * The signed-in person's Foundry connection, created on first access.
 *
 * One token per person rather than per campaign: the token says who a pushed
 * sheet belongs to, and which campaign it is for is a decision made here
 * afterwards. A DM running three campaigns out of one Foundry install pastes
 * one token, once.
 */
export async function getOrCreateFoundryConnection(
  supabase: SB,
  userId: string,
): Promise<FoundryConnection | null> {
  const { data: existing } = await supabase
    .from("foundry_connections")
    .select("ingest_token, last_import_at, import_count, verified_at")
    .eq("owner_id", userId)
    .maybeSingle();

  let row = existing;
  if (!row) {
    const { data: created, error } = await supabase
      .from("foundry_connections")
      .insert({ owner_id: userId, ingest_token: newIngestToken() })
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

/** Issue a new token, invalidating the old one — the only recovery when one
 *  leaks, and it keeps the import counters that delete-and-recreate loses. */
export async function rotateFoundryToken(
  supabase: SB,
  userId: string,
): Promise<FoundryConnection | null> {
  const { data, error } = await supabase
    .from("foundry_connections")
    .update({ ingest_token: newIngestToken(), verified_at: null })
    .eq("owner_id", userId)
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
