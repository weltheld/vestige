import "server-only";

import { format, parseISO } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, JournalRevisionActionDb, VoteValueDb } from "@vestige/db";
import type { CampaignSummary } from "@vestige/domain";

type SB = SupabaseClient<Database>;

export type ActivityItem = {
  id: string;
  module: "journal" | "calendar";
  campaignName: string;
  description: string;
  actorName: string | null;
  createdAt: string;
  href: string;
};

function name(p: { first_name: string | null; display_name: string | null } | undefined) {
  return p?.first_name?.trim() || p?.display_name?.trim() || "Someone";
}

function describeVote(value: VoteValueDb): string {
  switch (value) {
    case "yes":
      return "yes";
    case "maybe":
      return "maybe";
    case "no":
      return "no";
  }
}

function describeRevision(action: JournalRevisionActionDb): string {
  switch (action) {
    case "created":
      return "started a new session";
    case "edited":
      return "edited a session";
    case "commented":
      return "left a comment";
    case "annotated":
      return "added an annotation";
    case "image_added":
      return "added an image";
    case "character_added":
      return "added a character";
  }
}

/**
 * A unified recent-activity feed across the Journal and Calendar modules,
 * for the campaigns the viewer belongs to. Journal activity comes from
 * session_revisions (rich — every edit/comment/annotation is logged there).
 * Calendar has no equivalent revision log, so we surface DM-marked session
 * dates (campaign_sessions) — the most meaningful "something changed" signal
 * available without adding write-tracking to Council of Days.
 */
export async function getRecentActivity(
  supabase: SB,
  campaigns: CampaignSummary[],
  limit = 10,
): Promise<ActivityItem[]> {
  const journalIds = campaigns.filter((c) => c.modulesEnabled.journal).map((c) => c.id);
  const calendarIds = campaigns.filter((c) => c.modulesEnabled.calendar).map((c) => c.id);
  const nameById = new Map(campaigns.map((c) => [c.id, c.name]));
  const slugById = new Map(campaigns.map((c) => [c.id, c.slug]));

  const items: ActivityItem[] = [];

  if (journalIds.length > 0) {
    const { data: revisions } = await supabase
      .from("journal_session_revisions")
      .select(
        "id, action, author_id, created_at, journal_sessions!inner(id, campaign_id, title)",
      )
      .in("journal_sessions.campaign_id", journalIds)
      .order("created_at", { ascending: false })
      .limit(limit);

    const authorIds = [...new Set((revisions ?? []).map((r) => r.author_id))];
    const { data: profiles } = authorIds.length
      ? await supabase.from("profiles").select("id, first_name, display_name").in("id", authorIds)
      : { data: [] };
    const profById = new Map((profiles ?? []).map((p) => [p.id, p]));

    type Row = {
      id: string;
      action: JournalRevisionActionDb;
      author_id: string;
      created_at: string;
      journal_sessions: { id: string; campaign_id: string; title: string };
    };
    for (const r of (revisions ?? []) as unknown as Row[]) {
      const campaignId = r.journal_sessions.campaign_id;
      items.push({
        id: `journal:${r.id}`,
        module: "journal",
        campaignName: nameById.get(campaignId) ?? "Unknown campaign",
        description: `${describeRevision(r.action)} in "${r.journal_sessions.title}"`,
        actorName: name(profById.get(r.author_id)),
        createdAt: r.created_at,
        href: `/journal/c/${campaignId}/s/${r.journal_sessions.id}`,
      });
    }
  }

  if (calendarIds.length > 0) {
    const { data: sessions } = await supabase
      .from("campaign_sessions")
      .select("campaign_id, date, created_at")
      .in("campaign_id", calendarIds)
      .order("created_at", { ascending: false })
      .limit(limit);

    for (const s of sessions ?? []) {
      const slug = slugById.get(s.campaign_id);
      items.push({
        id: `calendar:${s.campaign_id}:${s.date}`,
        module: "calendar",
        campaignName: nameById.get(s.campaign_id) ?? "Unknown campaign",
        description: `A session was scheduled for ${format(parseISO(s.date), "MMM d")}`,
        actorName: null,
        createdAt: s.created_at,
        href: slug ? `/calendar/g/${slug}` : "/app",
      });
    }

    const { data: votes } = await supabase
      .from("votes")
      .select("campaign_id, user_id, date, value, updated_at")
      .in("campaign_id", calendarIds)
      .order("updated_at", { ascending: false })
      .limit(limit);

    const voterIds = [...new Set((votes ?? []).map((v) => v.user_id))];
    const { data: voterProfiles } = voterIds.length
      ? await supabase.from("profiles").select("id, first_name, display_name").in("id", voterIds)
      : { data: [] };
    const voterById = new Map((voterProfiles ?? []).map((p) => [p.id, p]));

    for (const v of votes ?? []) {
      const slug = slugById.get(v.campaign_id);
      items.push({
        id: `vote:${v.campaign_id}:${v.user_id}:${v.date}`,
        module: "calendar",
        campaignName: nameById.get(v.campaign_id) ?? "Unknown campaign",
        description: `voted ${describeVote(v.value)} for ${format(parseISO(v.date), "MMM d")}`,
        actorName: name(voterById.get(v.user_id)),
        createdAt: v.updated_at,
        href: slug ? `/calendar/g/${slug}` : "/app",
      });
    }
  }

  return items
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
