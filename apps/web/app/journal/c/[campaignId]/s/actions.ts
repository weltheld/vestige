"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@vestige/db/server";
import type { JournalCharacterRoleDb } from "@vestige/db";
import { syncNpcMentions } from "@/lib/journal/npc-sync";
import { isCampaignOwner } from "@/lib/journal/data";
import { extractSessionEntities } from "@/lib/journal/codex-extract";
import { seedCodexEntities, linkifyEntities } from "@/lib/journal/codex-ingest";

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

export type CodexExtractResult =
  | { ok: true; created: number; linked: number; total: number }
  | { ok: false; error: string };

/** Extract people/places/events from a session's text and add them to the
 *  campaign codex — the on-demand version of Familiar's ingest first pass.
 *  Owner-only: each run spends the campaign's AI key. New entries are
 *  created (existing summaries are never overwritten), the first occurrence
 *  of each name in the session text becomes a [Name](codex:id) link, and
 *  matching mention rows are inserted. */
export async function extractCodexFromSession(
  campaignId: string,
  sessionId: string,
): Promise<CodexExtractResult> {
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

  const extracted = await extractSessionEntities(supabase, campaignId, sessionText);
  if (!extracted.ok) return extracted;
  if (extracted.entities.length === 0) {
    return { ok: false, error: "Nothing codex-worthy found in this session." };
  }

  // How many are genuinely new (before seeding creates them).
  const { data: existing } = await supabase
    .from("npcs")
    .select("name")
    .eq("campaign_id", campaignId);
  const known = new Set((existing ?? []).map((n) => n.name.trim().toLowerCase()));
  const created = extracted.entities.filter((e) => !known.has(e.name.toLowerCase())).length;

  // The owner's own client passes the npcs RLS insert policy.
  const resolved = await seedCodexEntities(supabase, campaignId, userId, extracted.entities);
  if (resolved.length === 0) {
    return { ok: false, error: "Could not create codex entries. Try again." };
  }

  const { fields: linked, linkedIds } = linkifyEntities(
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
  if (linkedIds.length) {
    await supabase.from("npc_mentions").upsert(
      linkedIds.map((npc_id) => ({ npc_id, session_id: sessionId })),
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
  return { ok: true, created, linked: linkedIds.length, total: resolved.length };
}
