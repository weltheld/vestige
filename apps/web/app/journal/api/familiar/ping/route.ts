import { NextResponse } from "next/server";
import { getServiceRoleSupabase } from "@vestige/db/server";

/**
 * Lightweight connectivity check for the self-hosted Familiar app — confirms
 * the endpoint + token are valid without creating a real session, so the
 * connection can show as verified before the first recap is ever sent.
 *
 * Auth: same as /familiar/ingest — `Authorization: Bearer <ingest_token>`.
 *
 * Reachable at  <platform>/journal/api/familiar/ping.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
  }

  const admin = getServiceRoleSupabase();
  const { data: conn } = await admin
    .from("familiar_connections")
    .select("campaign_id")
    .eq("ingest_token", token)
    .maybeSingle();
  if (!conn) {
    return NextResponse.json({ error: "Invalid ingest token." }, { status: 401 });
  }

  await admin
    .from("familiar_connections")
    .update({ verified_at: new Date().toISOString() })
    .eq("campaign_id", conn.campaign_id);

  return NextResponse.json({ ok: true }, { status: 200 });
}
