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
  authorName: string;
  updatedAt: string;
  editorName: string | null;
  characters: SessionCharacter[];
  /** Annotations grouped by their anchor (a paragraph/block id). */
  annotationsByAnchor: Record<string, Annotation[]>;
  annotationCount: number;
  commentCount: number;
  revisionCount: number;
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
  const { data: s } = await supabase
    .from("journal_sessions")
    .select(
      "id, campaign_id, title, date, summary, player_characters, npcs, notes, image_url, created_by, created_at, updated_at, updated_by",
    )
    .eq("id", sessionId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (!s) return null;

  // Sequence number = sessions in this campaign dated on/before this one.
  const { count: priorCount } = await supabase
    .from("journal_sessions")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .lte("date", s.date ?? s.created_at);

  // Characters in this session.
  const { data: links } = await supabase
    .from("journal_session_characters")
    .select("character_id, journal_characters(id, name, role, portrait_url, bio)")
    .eq("session_id", sessionId);
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

  // Annotations + their authors.
  const { data: anns } = await supabase
    .from("journal_annotations")
    .select("id, anchor, body, author_id, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const { count: commentCount } = await supabase
    .from("journal_comments")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  const { count: revisionCount } = await supabase
    .from("journal_session_revisions")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  // Resolve author names for session + editor + annotation authors.
  const ids = new Set<string>([s.created_by]);
  if (s.updated_by) ids.add(s.updated_by);
  for (const a of anns ?? []) ids.add(a.author_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, display_name, avatar_url")
    .in("id", [...ids]);
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

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("modules_enabled")
    .eq("id", campaignId)
    .maybeSingle();
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
    authorName: name(profById.get(s.created_by)),
    updatedAt: s.updated_at,
    editorName: s.updated_by ? name(profById.get(s.updated_by)) : null,
    characters,
    annotationsByAnchor,
    annotationCount: (anns ?? []).length,
    commentCount: commentCount ?? 0,
    revisionCount: revisionCount ?? 0,
    modulesEnabled,
  };
}
