import { getServiceRoleSupabase } from "@vestige/db/server";
import { authorize, corsPreflight, json } from "@/lib/characters/foundry-api";

/**
 * Which campaigns this token's owner belongs to — lets the Foundry module
 * offer a dropdown of real campaigns to pair with, rather than making
 * someone copy a campaign id out of a URL by hand.
 *
 * Auth: `Authorization: Bearer <ingest_token>`.
 * Reachable at  <platform>/characters/api/foundry/campaigns.
 */
export async function POST(req: Request) {
  const result = await authorize(req);
  if (!result.ok) return result.response;

  const admin = getServiceRoleSupabase();
  const { data, error } = await admin
    .from("campaign_members")
    .select("campaigns(id, name)")
    .eq("user_id", result.auth.ownerId);
  if (error) return json({ error: error.message }, 500);

  const campaigns = (data ?? [])
    .map((row) => row.campaigns as unknown as { id: string; name: string } | null)
    .filter((c): c is { id: string; name: string } => !!c)
    .sort((a, b) => a.name.localeCompare(b.name));

  return json({ ok: true, campaigns });
}

export function OPTIONS() {
  return corsPreflight();
}
