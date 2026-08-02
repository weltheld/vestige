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
  /** The person the token belongs to. A pushed sheet is theirs; which
   *  campaign it is for is decided in Vestige afterwards. */
  ownerId: string;
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
    .select("owner_id, import_count")
    .eq("ingest_token", token)
    .maybeSingle();
  if (!conn) {
    return {
      ok: false,
      response: json(
        { error: "Invalid token. Copy it again from your Characters library in Vestige." },
        401,
      ),
    };
  }

  return { ok: true, auth: { ownerId: conn.owner_id, importCount: conn.import_count } };
}
