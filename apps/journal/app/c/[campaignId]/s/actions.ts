"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@vestige/db/server";
import type { JournalCharacterRoleDb } from "@vestige/db";

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
  revalidatePath(`/c/${campaignId}`);
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
  revalidatePath(`/c/${campaignId}/s/${sessionId}`);
}

export async function addCharacter(
  campaignId: string,
  sessionId: string,
  name: string,
  role: JournalCharacterRoleDb,
) {
  const { supabase, userId } = await uid();
  const { data: char, error } = await supabase
    .from("journal_characters")
    .insert({ campaign_id: campaignId, name, role })
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
  revalidatePath(`/c/${campaignId}/s/${sessionId}`);
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
  revalidatePath(`/c/${campaignId}/s/${sessionId}`);
}

export async function postComment(
  campaignId: string,
  sessionId: string,
  sectionAnchor: string | null,
  body: string,
  parentCommentId: string | null = null,
) {
  const { supabase, userId } = await uid();
  const { error } = await supabase.from("journal_comments").insert({
    session_id: sessionId,
    section_anchor: sectionAnchor,
    body,
    author_id: userId,
    parent_comment_id: parentCommentId,
  });
  if (error) throw error;
  await supabase.from("journal_session_revisions").insert({
    session_id: sessionId,
    author_id: userId,
    action: "commented",
    after_value: { section_anchor: sectionAnchor, body },
  });
  revalidatePath(`/c/${campaignId}/s/${sessionId}`);
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
  revalidatePath(`/c/${campaignId}/s/${sessionId}`);
}
