import "server-only";

import { format, parseISO } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, JournalRevisionActionDb } from "@vestige/db";
import type { CampaignSummary } from "@vestige/domain";

type SB = SupabaseClient<Database>;

export type ActivityItem = {
  id: string;
  module: "journal" | "calendar";
  /** "playday" = a session was scheduled — rendered with the same wax-seal
   *  medallion the DM stamps onto that date in Calendar. */
  variant?: "playday";
  campaignName: string;
  description: string;
  actorName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  href: string;
};

function name(p: { first_name: string | null; display_name: string | null } | undefined) {
  return p?.first_name?.trim() || p?.display_name?.trim() || "Someone";
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

  // Journal and Calendar activity touch entirely different tables — fetch
  // both branches concurrently instead of one after the other.
  const [journalItems, calendarItems] = await Promise.all([
    getJournalActivity(supabase, journalIds, nameById, limit),
    getCalendarActivity(supabase, calendarIds, nameById, slugById, limit),
  ]);

  return [...journalItems, ...calendarItems]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

async function getJournalActivity(
  supabase: SB,
  journalIds: string[],
  nameById: Map<string, string>,
  limit: number,
): Promise<ActivityItem[]> {
  const items: ActivityItem[] = [];
  if (journalIds.length > 0) {
    // Over-fetch: edits collapse to one line per person per day below, so
    // `limit` raw rows would under-fill the feed on busy days.
    const { data: revisions } = await supabase
      .from("journal_session_revisions")
      .select(
        "id, action, author_id, created_at, after_value, journal_sessions!inner(id, campaign_id, title)",
      )
      .in("journal_sessions.campaign_id", journalIds)
      .order("created_at", { ascending: false })
      .limit(limit * 10);

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
      after_value: { source?: string } | null;
      journal_sessions: { id: string; campaign_id: string; title: string };
    };
    // At most ONE journal-edit line and ONE codex-update line per person
    // per day — autosaves and repeated tweaks otherwise flood the feed.
    // Rows arrive newest-first, so the kept entry is the day's latest.
    const seenEdits = new Set<string>();
    for (const r of (revisions ?? []) as unknown as Row[]) {
      const campaignId = r.journal_sessions.campaign_id;
      const isCodex = r.after_value?.source === "codex-extract";
      if (r.action === "edited") {
        const key = `${r.author_id}:${r.created_at.slice(0, 10)}:${isCodex ? "codex" : "edit"}`;
        if (seenEdits.has(key)) continue;
        seenEdits.add(key);
      }
      items.push({
        id: `journal:${r.id}`,
        module: "journal",
        campaignName: nameById.get(campaignId) ?? "Unknown campaign",
        description: isCodex
          ? `updated the codex from "${r.journal_sessions.title}"`
          : `${describeRevision(r.action)} in "${r.journal_sessions.title}"`,
        actorName: name(profById.get(r.author_id)),
        avatarUrl: null,
        createdAt: r.created_at,
        href: `/journal/c/${campaignId}/s/${r.journal_sessions.id}`,
      });
      if (items.length >= limit) break;
    }
  }
  return items;
}

async function getCalendarActivity(
  supabase: SB,
  calendarIds: string[],
  nameById: Map<string, string>,
  slugById: Map<string, string>,
  limit: number,
): Promise<ActivityItem[]> {
  const items: ActivityItem[] = [];
  if (calendarIds.length > 0) {
    // Set dates and votes are independent tables — fetch together.
    const [{ data: sessions }, { data: votes }] = await Promise.all([
      supabase
        .from("campaign_sessions")
        .select("campaign_id, date, created_at")
        .in("campaign_id", calendarIds)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("votes")
        .select("campaign_id, user_id, date, updated_at")
        .in("campaign_id", calendarIds)
        .order("updated_at", { ascending: false })
        .limit(limit * 20),
    ]);

    for (const s of sessions ?? []) {
      const slug = slugById.get(s.campaign_id);
      items.push({
        id: `calendar:${s.campaign_id}:${s.date}`,
        module: "calendar",
        variant: "playday",
        campaignName: nameById.get(s.campaign_id) ?? "Unknown campaign",
        description: `A session was scheduled for ${format(parseISO(s.date), "MMM d")}`,
        actorName: null,
        avatarUrl: null,
        createdAt: s.created_at,
        href: slug ? `/calendar/g/${slug}` : "/app",
      });
    }

    // Group by (campaign, voter, day-cast) — one log line per person per
    // sitting at the poll, instead of one per individual vote.
    type VoteGroup = {
      campaignId: string;
      userId: string;
      count: number;
      latestUpdatedAt: string;
      months: Set<string>;
    };
    const voteGroups = new Map<string, VoteGroup>();
    for (const v of votes ?? []) {
      const castDay = v.updated_at.slice(0, 10);
      const key = `${v.campaign_id}:${v.user_id}:${castDay}`;
      const g = voteGroups.get(key);
      if (g) {
        g.count += 1;
        g.months.add(v.date.slice(0, 7));
        if (v.updated_at > g.latestUpdatedAt) g.latestUpdatedAt = v.updated_at;
      } else {
        voteGroups.set(key, {
          campaignId: v.campaign_id,
          userId: v.user_id,
          count: 1,
          latestUpdatedAt: v.updated_at,
          months: new Set([v.date.slice(0, 7)]),
        });
      }
    }

    const voterIds = [...new Set([...voteGroups.values()].map((g) => g.userId))];
    const [{ data: voterProfiles }, { data: voterMembers }] = voterIds.length
      ? await Promise.all([
          supabase.from("profiles").select("id, first_name, display_name, avatar_url").in("id", voterIds),
          supabase
            .from("campaign_members")
            .select("campaign_id, user_id, character_name, avatar_url")
            .in("campaign_id", calendarIds)
            .in("user_id", voterIds),
        ])
      : [{ data: [] }, { data: [] }];
    const voterById = new Map((voterProfiles ?? []).map((p) => [p.id, p]));
    const memberByKey = new Map(
      (voterMembers ?? []).map((m) => [`${m.campaign_id}:${m.user_id}`, m] as const),
    );

    for (const [key, g] of voteGroups) {
      const slug = slugById.get(g.campaignId);
      const profile = voterById.get(g.userId);
      const member = memberByKey.get(`${g.campaignId}:${g.userId}`);
      const monthSuffix =
        g.months.size === 1 ? ` for ${format(parseISO(`${[...g.months][0]}-01`), "MMMM")}` : "";
      items.push({
        id: `votes:${key}`,
        module: "calendar",
        campaignName: nameById.get(g.campaignId) ?? "Unknown campaign",
        description: `placed ${g.count} vote${g.count === 1 ? "" : "s"}${monthSuffix}`,
        actorName: member?.character_name || name(profile),
        avatarUrl: member?.avatar_url || profile?.avatar_url || null,
        createdAt: g.latestUpdatedAt,
        href: slug ? `/calendar/g/${slug}` : "/app",
      });
    }
  }

  return items;
}
