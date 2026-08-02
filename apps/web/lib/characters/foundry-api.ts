import "server-only";

import { NextResponse } from "next/server";
import { getServiceRoleSupabase } from "@vestige/db/server";

/**
 * Shared plumbing for the three /characters/api/foundry routes.
 *
 * These differ from the Familiar ingest route in one way that matters:
 * Familiar is a Node app, while this caller is a browser — Foundry's own
 * page, served from http://localhost:30000 or whatever the DM's install
 * uses. So every response needs CORS headers and every route needs an
 * OPTIONS handler, or the preflight for the Authorization header fails
 * before the request is ever made.
 *
 * Origin is `*` on purpose. There is no cookie or session to protect: the
 * bearer token is the entire authorization, requests are sent without
 * credentials, and the set of legitimate Foundry origins is unknowable
 * (every self-hosted install picks its own host and port).
 */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
} as const;

export function corsPreflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export type Authorized = {
  campaignId: string;
  /** campaigns.creator_id — sheets pushed from Foundry are attributed to the
   *  campaign's creator, since the token identifies a campaign, not a person. */
  creatorId: string;
  importCount: number;
};

/**
 * Resolve the bearer token to a campaign, or return the response to send.
 *
 * Returns a discriminated pair rather than throwing so each route can keep
 * its happy path flat.
 */
export async function authorize(
  req: Request,
): Promise<{ ok: true; auth: Authorized } | { ok: false; response: Response }> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return { ok: false, response: json({ error: "Missing bearer token." }, 401) };
  }

  const admin = getServiceRoleSupabase();
  const { data: conn } = await admin
    .from("foundry_connections")
    .select("campaign_id, import_count")
    .eq("ingest_token", token)
    .maybeSingle();
  if (!conn) {
    return {
      ok: false,
      response: json(
        { error: "Invalid token. Copy it again from the campaign's Characters page." },
        401,
      ),
    };
  }

  const { data: campaign } = await admin
    .from("campaigns")
    .select("creator_id")
    .eq("id", conn.campaign_id)
    .maybeSingle();
  if (!campaign?.creator_id) {
    return { ok: false, response: json({ error: "Campaign not found." }, 404) };
  }

  return {
    ok: true,
    auth: {
      campaignId: conn.campaign_id,
      creatorId: campaign.creator_id,
      importCount: conn.import_count,
    },
  };
}
