import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@vestige/db";

type SB = SupabaseClient<Database>;

export type SessionListItem = {
  id: string;
  number: number;
  title: string;
  date: string | null;
  excerpt: string;
  imageUrl: string | null;
  authorName: string;
  updatedAt: string;
};

export type CampaignHeader = {
  name: string;
  coverUrl: string | null;
  sessionCount: number;
  startedAt: string | null;
  /** Party member portrait URLs (for the hero avatar group). */
  memberAvatars: string[];
};

function excerptOf(summary: string | null): string {
  if (!summary) return "";
  const text = summary.replace(/\s+/g, " ").trim();
  return text.length > 200 ? `${text.slice(0, 200)}…` : text;
}

function displayName(p: { first_name: string | null; display_name: string | null } | undefined) {
  return p?.first_name?.trim() || p?.display_name?.trim() || "Unknown";
}

/** Sessions for a campaign, newest first, with author name + sequence number. */
export async function getSessions(supabase: SB, campaignId: string): Promise<SessionListItem[]> {
  const { data: rows, error } = await supabase
    .from("journal_sessions")
    .select("id, title, date, summary, image_url, created_by, updated_at, created_at")
    .eq("campaign_id", campaignId);
  if (error) throw error;
  const sessions = rows ?? [];
  if (sessions.length === 0) return [];

  // Sequence numbers follow chronological order (oldest = Session 01).
  const chronological = [...sessions].sort((a, b) =>
    (a.date ?? a.created_at).localeCompare(b.date ?? b.created_at),
  );
  const numberById = new Map(chronological.map((s, i) => [s.id, i + 1]));

  const authorIds = [...new Set(sessions.map((s) => s.created_by))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, display_name")
    .in("id", authorIds);
  const nameById = new Map((profiles ?? []).map((p) => [p.id, displayName(p)]));

  return sessions
    .sort((a, b) => (b.date ?? b.created_at).localeCompare(a.date ?? a.created_at))
    .map((s) => ({
      id: s.id,
      number: numberById.get(s.id) ?? 0,
      title: s.title,
      date: s.date,
      excerpt: excerptOf(s.summary),
      imageUrl: s.image_url,
      authorName: nameById.get(s.created_by) ?? "Unknown",
      updatedAt: s.updated_at,
    }));
}

/** Hero data for a campaign's Journal home. */
export async function getCampaignHeader(
  supabase: SB,
  campaignId: string,
  campaign: { name: string; coverUrl: string | null },
): Promise<CampaignHeader> {
  const [{ count }, { data: earliest }, { data: members }] = await Promise.all([
    supabase
      .from("journal_sessions")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId),
    supabase
      .from("journal_sessions")
      .select("date")
      .eq("campaign_id", campaignId)
      .not("date", "is", null)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from("campaign_members").select("avatar_url").eq("campaign_id", campaignId).limit(6),
  ]);

  return {
    name: campaign.name,
    coverUrl: campaign.coverUrl,
    sessionCount: count ?? 0,
    startedAt: earliest?.date ?? null,
    memberAvatars: (members ?? [])
      .map((m) => m.avatar_url)
      .filter((u): u is string => !!u),
  };
}
