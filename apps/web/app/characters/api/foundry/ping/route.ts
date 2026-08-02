import { getServiceRoleSupabase } from "@vestige/db/server";
import { authorize, corsPreflight, json } from "@/lib/characters/foundry-api";

/**
 * Connectivity check for the Foundry module's setup — confirms the URL and
 * token work without importing anything, so a misconfiguration is caught at
 * setup rather than mid-session.
 *
 * Auth: `Authorization: Bearer <ingest_token>`.
 * Reachable at  <platform>/characters/api/foundry/ping.
 */
export async function POST(req: Request) {
  const result = await authorize(req);
  if (!result.ok) return result.response;

  const admin = getServiceRoleSupabase();
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, character_name")
    .eq("id", result.auth.ownerId)
    .maybeSingle();

  await admin
    .from("foundry_connections")
    .update({ verified_at: new Date().toISOString() })
    .eq("owner_id", result.auth.ownerId);

  // Whose library the token opens. A DM holding tokens for a test account
  // and a real one wants to know which they just pasted.
  return json({
    ok: true,
    account: profile?.display_name ?? profile?.character_name ?? null,
  });
}

export function OPTIONS() {
  return corsPreflight();
}
