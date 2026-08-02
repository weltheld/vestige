import { getServiceRoleSupabase } from "@vestige/db/server";
import { authorize, corsPreflight, json } from "@/lib/characters/foundry-api";

/**
 * Connectivity check for the Foundry module's "Test connection" button —
 * confirms the URL and token work without importing anything, so a
 * misconfiguration is caught at setup rather than mid-session.
 *
 * Auth: `Authorization: Bearer <ingest_token>`.
 * Reachable at  <platform>/characters/api/foundry/ping.
 */
export async function POST(req: Request) {
  const result = await authorize(req);
  if (!result.ok) return result.response;

  const admin = getServiceRoleSupabase();
  const { data: campaign } = await admin
    .from("campaigns")
    .select("name")
    .eq("id", result.auth.campaignId)
    .maybeSingle();

  await admin
    .from("foundry_connections")
    .update({ verified_at: new Date().toISOString() })
    .eq("campaign_id", result.auth.campaignId);

  // The campaign name comes back so the module can show *which* campaign the
  // token points at. A DM with three campaigns pasted the wrong token often
  // enough that "connected" alone isn't a useful answer.
  return json({ ok: true, campaign: campaign?.name ?? null });
}

export function OPTIONS() {
  return corsPreflight();
}
