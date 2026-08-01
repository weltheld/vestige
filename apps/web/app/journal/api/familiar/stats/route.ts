import { NextResponse } from "next/server";
import { getServiceRoleSupabase } from "@vestige/db/server";
import { parseSpeakingStats } from "@/lib/journal/speaking-stats";

/**
 * Attach talk-time stats to a session that already exists.
 *
 * The reason this is its own endpoint rather than a flag on /ingest: /ingest
 * INSERTS a session. Re-sending a recap to add stats would create a duplicate
 * entry, and any editing done in Vestige since would sit in the older of two
 * copies. This route writes exactly one column and selects nothing else, so
 * prose that has been corrected by hand cannot be touched by it.
 *
 * POST <platform>/journal/api/familiar/stats
 *   Authorization: Bearer <ingest token>
 *   {
 *     "date":          "2026-07-20",   // the session's date
 *     "speakingStats": { spanSeconds, speakers: [{ name, seconds }] }
 *   }
 *
 * Matching is by date, because Familiar has no Vestige session id to work
 * from — it never recorded the id /ingest returned. If a campaign has more
 * than one session on a date the most recent is updated, and the response
 * says which, so a wrong guess is visible rather than silent.
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

  const date = typeof body.date === "string" ? body.date.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "A `date` in YYYY-MM-DD form is required." },
      { status: 400 },
    );
  }

  const stats = parseSpeakingStats(body.speakingStats);
  if (!stats) {
    return NextResponse.json(
      { error: "`speakingStats` is missing or has no usable speakers." },
      { status: 400 },
    );
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

  // Scoped to the token's campaign, so a token can only ever reach its own
  // sessions however the date is chosen.
  const { data: sessions } = await admin
    .from("journal_sessions")
    .select("id, title")
    .eq("campaign_id", conn.campaign_id)
    .eq("date", date)
    .order("created_at", { ascending: false })
    .limit(2);

  const target = sessions?.[0];
  if (!target) {
    return NextResponse.json(
      { error: `No session dated ${date} in this campaign.` },
      { status: 404 },
    );
  }

  const { error } = await admin
    .from("journal_sessions")
    .update({ speaking_stats: stats })
    .eq("id", target.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    sessionId: target.id,
    title: target.title,
    speakers: stats.speakers.length,
    // Surfaced so the caller can warn rather than silently pick for the user.
    ambiguous: (sessions?.length ?? 0) > 1,
  });
}
