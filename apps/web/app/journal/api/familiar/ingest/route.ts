import { NextResponse } from "next/server";
import { getServiceRoleSupabase } from "@vestige/db/server";
import {
  parseIngestEntities,
  seedCodexEntities,
  linkifyEntities,
} from "@/lib/journal/codex-ingest";
import { parseSpeakingStats } from "@/lib/journal/speaking-stats";

/**
 * Recap ingestion endpoint for the self-hosted Familiar app.
 *
 * Auth: `Authorization: Bearer <ingest_token>` — the per-campaign token the
 * DM copies from journal campaign settings. We look the token up with the
 * service role (so a valid token, and nothing else, is what authorizes the
 * write); the token itself never touches Supabase auth.
 *
 * Body (application/json):
 *   {
 *     "title":            string   (required),
 *     "date":             string?  (ISO yyyy-mm-dd),
 *     "summary":          string?  (markdown — the recap overview / events),
 *     "playerCharacters": string?  (markdown),
 *     "npcs":             string?  (markdown),
 *     "notes":            string?  (markdown — locations, loot, threads, …),
 *     "codexEntities":    [{name, kind: person|place|event, summary}]?
 *     "speakingStats":    {spanSeconds, speakers:[{name, seconds}]}?
 *                         — Familiar's first-pass extraction; seeds the
 *                         campaign codex and links the names in the text.
 *   }
 *
 * Reachable at  <platform>/journal/api/familiar/ingest  (this app's basePath
 * is "/journal").
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "A non-empty `title` is required." }, { status: 400 });
  }
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

  const admin = getServiceRoleSupabase();

  const { data: conn } = await admin
    .from("familiar_connections")
    .select("campaign_id, recap_count")
    .eq("ingest_token", token)
    .maybeSingle();
  if (!conn) {
    return NextResponse.json({ error: "Invalid ingest token." }, { status: 401 });
  }

  // journal_sessions.created_by is NOT NULL (FK to auth.users). Recaps from
  // Familiar are authored on behalf of the campaign's creator.
  const { data: campaign } = await admin
    .from("campaigns")
    .select("creator_id")
    .eq("id", conn.campaign_id)
    .maybeSingle();
  if (!campaign?.creator_id) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  // Codex first pass — resolve/create the entities Familiar extracted, then
  // rewrite the recap text so each name is a [Name](codex:id) link (the same
  // form the editor writes, so mentions are clickable and survive edits).
  const entities = parseIngestEntities(body.codexEntities);
  const resolvedEntities = await seedCodexEntities(
    admin,
    conn.campaign_id,
    campaign.creator_id,
    entities,
  );
  const { fields: linked, linkedIds } = linkifyEntities(
    { summary: str(body.summary), npcs: str(body.npcs), notes: str(body.notes) },
    resolvedEntities,
  );

  const { data: session, error } = await admin
    .from("journal_sessions")
    .insert({
      campaign_id: conn.campaign_id,
      created_by: campaign.creator_id,
      title,
      date: str(body.date),
      summary: linked.summary,
      player_characters: str(body.playerCharacters),
      npcs: linked.npcs,
      notes: linked.notes,
      // Validated rather than trusted: this arrives on an authenticated but
      // external request, and an unparseable blob should leave the column
      // NULL (no card) instead of half-populating one.
      speaking_stats: parseSpeakingStats(body.speakingStats),
    })
    .select("id")
    .single();
  if (error || !session) {
    return NextResponse.json({ error: "Could not create the session." }, { status: 500 });
  }

  // Mention rows for the entities we actually linked in the text — matches
  // what syncNpcMentions would reconcile to on a later manual save.
  if (linkedIds.length) {
    await admin.from("npc_mentions").upsert(
      linkedIds.map((npc_id) => ({ npc_id, session_id: session.id })),
      { onConflict: "npc_id,session_id", ignoreDuplicates: true },
    );
  }

  // Append a revision (the change log) + stamp the connection so the journal
  // can show "connected / last recap …".
  await admin.from("journal_session_revisions").insert({
    session_id: session.id,
    author_id: campaign.creator_id,
    action: "created",
    after_value: { title, source: "familiar" },
  });
  await admin
    .from("familiar_connections")
    .update({ last_recap_at: new Date().toISOString(), recap_count: conn.recap_count + 1 })
    .eq("campaign_id", conn.campaign_id);

  return NextResponse.json(
    { ok: true, sessionId: session.id, codexEntities: resolvedEntities.length },
    { status: 201 },
  );
}
