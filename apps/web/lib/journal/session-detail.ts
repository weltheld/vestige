import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, JournalCharacterRoleDb } from "@vestige/db";

type SB = SupabaseClient<Database>;

export type SessionCharacter = {
  id: string;
  name: string;
  role: JournalCharacterRoleDb;
  portraitUrl: string | null;
  bio: string | null;
};

export type Annotation = {
  id: string;
  anchor: string;
  body: string;
  authorName: string;
  authorAvatar: string | null;
  createdAt: string;
};

export type SessionImage = {
  id: string;
  url: string;
};

export type SessionDetail = {
  id: string;
  number: number;
  title: string;
  date: string | null;
  summary: string | null;
  playerCharacters: string | null;
  npcs: string | null;
  notes: string | null;
  imageUrl: string | null;
  /** The session's full image gallery — imageUrl is "the session image"
   *  (the one shown at the hero/highest level), a pointer into this list. */
  images: SessionImage[];
  authorName: string;
  updatedAt: string;
  editorName: string | null;
  characters: SessionCharacter[];
  /** Annotations grouped by their anchor (a paragraph/block id). */
  annotationsByAnchor: Record<string, Annotation[]>;
  annotationCount: number;
  modulesEnabled: { calendar: boolean; journal: boolean };
};

function name(p: { first_name: string | null; display_name: string | null } | undefined) {
  return p?.first_name?.trim() || p?.display_name?.trim() || "Unknown";
}

/** Everything the read-mode session detail page needs, in coordinated queries. */
export async function getSessionDetail(
  supabase: SB,
  campaignId: string,
  sessionId: string,
): Promise<SessionDetail | null> {
  // First wave — everything that only needs the ids we already have.
  const [{ data: s }, { data: links }, { data: anns }, { data: campaign }, { data: images }] =
    await Promise.all([
      supabase
        .from("journal_sessions")
        .select(
          "id, campaign_id, title, date, summary, player_characters, npcs, notes, image_url, created_by, created_at, updated_at, updated_by",
        )
        .eq("id", sessionId)
        .eq("campaign_id", campaignId)
        .maybeSingle(),
      supabase
        .from("journal_session_characters")
        .select("character_id, journal_characters(id, name, role, portrait_url, bio)")
        .eq("session_id", sessionId),
      supabase
        .from("journal_annotations")
        .select("id, anchor, body, author_id, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true }),
      supabase.from("campaigns").select("modules_enabled").eq("id", campaignId).maybeSingle(),
      supabase
        .from("journal_session_images")
        .select("id, url")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true }),
    ]);
  if (!s) return null;

  type CharRow = {
    id: string;
    name: string;
    role: JournalCharacterRoleDb;
    portrait_url: string | null;
    bio: string | null;
  };
  const characters: SessionCharacter[] = (links ?? [])
    .map((l) => (l as { journal_characters: CharRow | null }).journal_characters)
    .filter((c): c is CharRow => !!c)
    .map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      portraitUrl: c.portrait_url,
      bio: c.bio,
    }));

  // Second wave — both need data from the first (session row / annotation
  // authors). Comment + revision counts are derived by the page from the
  // full lists it already loads, so no separate COUNT queries here.
  const authorIds = new Set<string>([s.created_by]);
  if (s.updated_by) authorIds.add(s.updated_by);
  for (const a of anns ?? []) authorIds.add(a.author_id);

  const [{ count: priorCount }, { data: profiles }] = await Promise.all([
    // Sequence number = sessions in this campaign dated on/before this one.
    supabase
      .from("journal_sessions")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .lte("date", s.date ?? s.created_at),
    supabase
      .from("profiles")
      .select("id, first_name, display_name, avatar_url")
      .in("id", [...authorIds]),
  ]);
  const profById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const annotationsByAnchor: Record<string, Annotation[]> = {};
  for (const a of anns ?? []) {
    const p = profById.get(a.author_id);
    (annotationsByAnchor[a.anchor] ??= []).push({
      id: a.id,
      anchor: a.anchor,
      body: a.body,
      authorName: name(p),
      authorAvatar: p?.avatar_url ?? null,
      createdAt: a.created_at,
    });
  }

  const modulesEnabled = (campaign?.modules_enabled as { calendar: boolean; journal: boolean }) ?? {
    calendar: true,
    journal: true,
  };

  return {
    id: s.id,
    number: priorCount ?? 1,
    title: s.title,
    date: s.date,
    summary: s.summary,
    playerCharacters: s.player_characters,
    npcs: s.npcs,
    notes: s.notes,
    imageUrl: s.image_url,
    images: images ?? [],
    authorName: name(profById.get(s.created_by)),
    updatedAt: s.updated_at,
    editorName: s.updated_by ? name(profById.get(s.updated_by)) : null,
    characters,
    annotationsByAnchor,
    annotationCount: (anns ?? []).length,
    modulesEnabled,
  };
}
