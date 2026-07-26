"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@vestige/db/server";
import type { JournalCharacterRoleDb, NpcKindDb } from "@vestige/db";
import { syncNpcMentions } from "@/lib/journal/npc-sync";
import { isCampaignOwner } from "@/lib/journal/data";
import { extractSessionEntities } from "@/lib/journal/codex-extract";
import { seedCodexEntities, linkifyEntities } from "@/lib/journal/codex-ingest";
import { isReactionEmoji } from "@/lib/journal/reactions";

export type SessionInput = {
  title: string;
  date: string | null;
  summary: string | null;
  player_characters: string | null;
  npcs: string | null;
  notes: string | null;
  image_url?: string | null;
};

async function uid() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, userId: user.id };
}

/** Create a new session (RLS allows any campaign member) + log 'created'. */
export async function createSession(campaignId: string, input: SessionInput) {
  const { supabase, userId } = await uid();
  const { data, error } = await supabase
    .from("journal_sessions")
    .insert({ campaign_id: campaignId, created_by: userId, ...input })
    .select("id")
    .single();
  if (error) throw error;

  await supabase.from("journal_session_revisions").insert({
    session_id: data.id,
    author_id: userId,
    action: "created",
    after_value: input,
  });
  await syncNpcMentions(supabase, data.id, [
    input.summary,
    input.player_characters,
    input.npcs,
    input.notes,
  ]);
  revalidatePath(`/journal/c/${campaignId}`);
  return data.id;
}

/** Persist edits. `recordRevision` writes an 'edited' revision (explicit save);
 *  autosave passes false to just persist the draft (avoids revision spam). */
export async function saveSession(
  campaignId: string,
  sessionId: string,
  input: SessionInput,
  recordRevision: boolean,
) {
  const { supabase, userId } = await uid();

  let before: Record<string, unknown> | null = null;
  if (recordRevision) {
    const { data } = await supabase
      .from("journal_sessions")
      .select("title, date, summary, player_characters, npcs, notes")
      .eq("id", sessionId)
      .maybeSingle();
    before = data ?? null;
  }

  const { error } = await supabase
    .from("journal_sessions")
    .update({ ...input, updated_by: userId, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw error;

  if (recordRevision) {
    await supabase.from("journal_session_revisions").insert({
      session_id: sessionId,
      author_id: userId,
      action: "edited",
      before_value: before,
      after_value: input,
    });
  }
  await syncNpcMentions(supabase, sessionId, [
    input.summary,
    input.player_characters,
    input.npcs,
    input.notes,
  ]);
  revalidatePath(`/journal/c/${campaignId}/s/${sessionId}`);
  revalidatePath(`/journal/c/${campaignId}/codex`);
}

export async function addCharacter(
  campaignId: string,
  sessionId: string,
  name: string,
  role: JournalCharacterRoleDb,
  portraitUrl: string | null = null,
) {
  const { supabase, userId } = await uid();
  const { data: char, error } = await supabase
    .from("journal_characters")
    .insert({ campaign_id: campaignId, name, role, portrait_url: portraitUrl })
    .select("id")
    .single();
  if (error) throw error;
  await supabase
    .from("journal_session_characters")
    .insert({ session_id: sessionId, character_id: char.id });
  await supabase.from("journal_session_revisions").insert({
    session_id: sessionId,
    author_id: userId,
    action: "character_added",
    after_value: { name, role },
  });
  revalidatePath(`/journal/c/${campaignId}/s/${sessionId}`);
}

export async function removeCharacter(
  campaignId: string,
  sessionId: string,
  characterId: string,
) {
  const { supabase } = await uid();
  await supabase
    .from("journal_session_characters")
    .delete()
    .eq("session_id", sessionId)
    .eq("character_id", characterId);
  revalidatePath(`/journal/c/${campaignId}/s/${sessionId}`);
}

/** Add an image to the session's gallery. The first image ever added also
 *  becomes the session image (the one shown at the hero/highest level). */
export async function addSessionImage(campaignId: string, sessionId: string, url: string) {
  const { supabase, userId } = await uid();
  const { error } = await supabase
    .from("journal_session_images")
    .insert({ session_id: sessionId, url, created_by: userId });
  if (error) throw error;

  const { data: session } = await supabase
    .from("journal_sessions")
    .select("image_url")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session?.image_url) {
    await supabase.from("journal_sessions").update({ image_url: url }).eq("id", sessionId);
  }

  await supabase.from("journal_session_revisions").insert({
    session_id: sessionId,
    author_id: userId,
    action: "image_added",
    after_value: { url },
  });
  revalidatePath(`/journal/c/${campaignId}/s/${sessionId}`);
  revalidatePath(`/journal/c/${campaignId}/s/${sessionId}/edit`);
}

/** Remove an image from the gallery. If it was the session image, the next
 *  remaining gallery image (if any) takes over; otherwise it's cleared. */
export async function removeSessionImage(campaignId: string, sessionId: string, imageId: string) {
  const { supabase } = await uid();
  const { data: image } = await supabase
    .from("journal_session_images")
    .select("url")
    .eq("id", imageId)
    .maybeSingle();

  await supabase.from("journal_session_images").delete().eq("id", imageId);

  const { data: session } = await supabase
    .from("journal_sessions")
    .select("image_url")
    .eq("id", sessionId)
    .maybeSingle();
  if (image?.url && session?.image_url === image.url) {
    const { data: next } = await supabase
      .from("journal_session_images")
      .select("url")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    await supabase
      .from("journal_sessions")
      .update({ image_url: next?.url ?? null })
      .eq("id", sessionId);
  }
  revalidatePath(`/journal/c/${campaignId}/s/${sessionId}`);
  revalidatePath(`/journal/c/${campaignId}/s/${sessionId}/edit`);
}

/** Set which gallery image is "the session image" shown at the hero level. */
export async function setSessionCoverImage(campaignId: string, sessionId: string, url: string) {
  const { supabase } = await uid();
  const { error } = await supabase
    .from("journal_sessions")
    .update({ image_url: url })
    .eq("id", sessionId);
  if (error) throw error;
  revalidatePath(`/journal/c/${campaignId}/s/${sessionId}`);
  revalidatePath(`/journal/c/${campaignId}/s/${sessionId}/edit`);
}

/** Delete a session and everything under it (characters, annotations,
 *  comments, revisions cascade via FK). RLS: any campaign member. */
export async function deleteSession(campaignId: string, sessionId: string) {
  const { supabase } = await uid();
  const { error } = await supabase
    .from("journal_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("campaign_id", campaignId);
  if (error) throw error;
  revalidatePath(`/journal/c/${campaignId}`);
}

/**
 * Add or remove the viewer's reaction on a paragraph. Idempotent in both
 * directions: the row's primary key is (session, anchor, user, emoji), so a
 * double-click can't double-count and removing a reaction that isn't there
 * is a no-op. RLS additionally pins user_id to the caller.
 */
export async function toggleReaction(
  campaignId: string,
  sessionId: string,
  anchor: string,
  emoji: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isReactionEmoji(emoji)) {
    return { ok: false, error: "Unknown reaction." };
  }
  const { supabase, userId } = await uid();

  const { data: existing } = await supabase
    .from("journal_reactions")
    .select("emoji")
    .eq("session_id", sessionId)
    .eq("anchor", anchor)
    .eq("user_id", userId)
    .eq("emoji", emoji)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("journal_reactions")
        .delete()
        .eq("session_id", sessionId)
        .eq("anchor", anchor)
        .eq("user_id", userId)
        .eq("emoji", emoji)
    : await supabase
        .from("journal_reactions")
        .insert({ session_id: sessionId, anchor, emoji, user_id: userId });

  if (error) {
    console.error("[toggleReaction]", error);
    return { ok: false, error: "Could not save that reaction." };
  }
  revalidatePath(`/journal/c/${campaignId}/s/${sessionId}`);
  return { ok: true };
}

/**
 * Remove one of your own comments. RLS is the real guard — the
 * journal_annotations delete policy is `author_id = auth.uid()` — so a
 * request for someone else's comment simply matches no row.
 */
export async function deleteAnnotation(
  campaignId: string,
  sessionId: string,
  annotationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId } = await uid();
  const { error } = await supabase
    .from("journal_annotations")
    .delete()
    .eq("id", annotationId)
    .eq("author_id", userId);
  if (error) {
    console.error("[deleteAnnotation]", error);
    return { ok: false, error: "Could not delete that comment." };
  }
  revalidatePath(`/journal/c/${campaignId}/s/${sessionId}`);
  return { ok: true };
}

export async function addAnnotation(
  campaignId: string,
  sessionId: string,
  anchor: string,
  body: string,
) {
  const { supabase, userId } = await uid();
  const { error } = await supabase
    .from("journal_annotations")
    .insert({ session_id: sessionId, anchor, body, author_id: userId });
  if (error) throw error;
  await supabase.from("journal_session_revisions").insert({
    session_id: sessionId,
    author_id: userId,
    action: "annotated",
    after_value: { anchor, body },
  });
  revalidatePath(`/journal/c/${campaignId}/s/${sessionId}`);
}

export type ExtractedEntityPreview = {
  name: string;
  kind: NpcKindDb;
  summary: string;
  /** Set when an entry with this name already exists in the codex —
   *  selecting it links this session to it instead of creating a new one. */
  existingId: string | null;
};

export type PreviewCodexExtractionResult =
  | { ok: true; entities: ExtractedEntityPreview[] }
  | { ok: false; error: string };

/** Run the AI extraction pass over a session and return what it found,
 *  WITHOUT writing anything — the review step lets the owner pick which
 *  entities actually get added before anything touches the codex. Owner-
 *  only: this is the step that spends the campaign's AI key. */
export async function previewCodexExtraction(
  campaignId: string,
  sessionId: string,
): Promise<PreviewCodexExtractionResult> {
  const { supabase, userId } = await uid();
  if (!(await isCampaignOwner(supabase, userId, campaignId))) {
    return { ok: false, error: "Only the campaign owner can extract codex entries." };
  }

  const { data: session } = await supabase
    .from("journal_sessions")
    .select("id, campaign_id, title, summary, player_characters, npcs, notes")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.campaign_id !== campaignId) {
    return { ok: false, error: "Session not found." };
  }

  const sessionText = [
    `# ${session.title}`,
    session.summary,
    session.player_characters ? `## Player characters\n${session.player_characters}` : null,
    session.npcs ? `## NPCs\n${session.npcs}` : null,
    session.notes ? `## Notes\n${session.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Everything but the title being empty means the write-up isn't saved yet
  // (or went into a different session) — worth saying plainly, because
  // spending an AI call to be told "nothing found" sends people looking at
  // their prose instead of at where it actually went.
  const bodyLength = [session.summary, session.player_characters, session.npcs, session.notes]
    .map((f) => f?.trim() ?? "")
    .join("").length;
  if (bodyLength < 40) {
    return {
      ok: false,
      error:
        "This session has no write-up saved yet — add the text and save, then try again.",
    };
  }

  const extracted = await extractSessionEntities(supabase, campaignId, sessionText);
  if (!extracted.ok) return extracted;
  if (extracted.entities.length === 0) {
    return {
      ok: false,
      error: `Nothing codex-worthy found in the ${bodyLength.toLocaleString()} characters of this session.`,
    };
  }

  const { data: existing } = await supabase
    .from("npcs")
    .select("id, name")
    .eq("campaign_id", campaignId);
  const existingByName = new Map((existing ?? []).map((n) => [n.name.trim().toLowerCase(), n.id] as const));

  return {
    ok: true,
    entities: extracted.entities.map((e) => ({
      name: e.name,
      kind: e.kind,
      summary: e.summary,
      existingId: existingByName.get(e.name.trim().toLowerCase()) ?? null,
    })),
  };
}

export type ApplyCodexExtractionResult =
  | { ok: true; created: number; linked: number }
  | { ok: false; error: string };

/** Add the owner's SELECTED subset of a previewed extraction to the codex —
 *  the on-demand version of Familiar's ingest first pass. New entries are
 *  created (existing summaries are never overwritten), the first occurrence
 *  of each name in the session text becomes a [Name](codex:id) link, and
 *  matching mention rows are inserted. */
export async function applyCodexExtraction(
  campaignId: string,
  sessionId: string,
  selected: Array<{ name: string; kind: NpcKindDb; summary: string }>,
): Promise<ApplyCodexExtractionResult> {
  const { supabase, userId } = await uid();
  if (!(await isCampaignOwner(supabase, userId, campaignId))) {
    return { ok: false, error: "Only the campaign owner can add codex entries." };
  }
  if (selected.length === 0) return { ok: false, error: "Nothing selected." };

  const { data: session } = await supabase
    .from("journal_sessions")
    .select("id, campaign_id, summary, npcs, notes")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.campaign_id !== campaignId) {
    return { ok: false, error: "Session not found." };
  }

  // How many are genuinely new (before seeding creates them).
  const { data: existing } = await supabase
    .from("npcs")
    .select("name")
    .eq("campaign_id", campaignId);
  const known = new Set((existing ?? []).map((n) => n.name.trim().toLowerCase()));
  const created = selected.filter((e) => !known.has(e.name.trim().toLowerCase())).length;

  // The owner's own client passes the npcs RLS insert policy.
  const resolved = await seedCodexEntities(supabase, campaignId, userId, selected);
  if (resolved.length === 0) {
    return { ok: false, error: "Could not create codex entries. Try again." };
  }

  const { fields: linked } = linkifyEntities(
    { summary: session.summary, npcs: session.npcs, notes: session.notes },
    resolved,
  );
  const { error: updateError } = await supabase
    .from("journal_sessions")
    .update({
      summary: linked.summary,
      npcs: linked.npcs,
      notes: linked.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
  if (updateError) {
    return { ok: false, error: "Codex entries were created, but linking the text failed." };
  }
  // Record a mention for EVERY selected entity — that's its "Appears in"
  // provenance. This is independent of linkifyEntities, which only
  // produces an in-text hyperlink when it can match the name verbatim; an
  // entity that couldn't be string-matched still belongs to this session
  // and must show up under "Appears in".
  if (resolved.length) {
    await supabase.from("npc_mentions").upsert(
      resolved.map((e) => ({ npc_id: e.id, session_id: sessionId })),
      { onConflict: "npc_id,session_id", ignoreDuplicates: true },
    );
  }

  await supabase.from("journal_session_revisions").insert({
    session_id: sessionId,
    author_id: userId,
    action: "edited",
    after_value: { source: "codex-extract", entities: resolved.length },
  });

  revalidatePath(`/journal/c/${campaignId}/s/${sessionId}`);
  revalidatePath(`/journal/c/${campaignId}/codex`);
  return { ok: true, created, linked: resolved.length };
}
