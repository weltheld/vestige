"use server";

import {
  getServerSupabase,
  getServiceRoleSupabase,
} from "@/lib/supabase/server";

export type LibImage = { id: string; url: string };

export type UploadImageResult =
  | { ok: true; image: LibImage }
  | { ok: false; error: string };

/**
 * Upload a character portrait into the user's reusable image library.
 * The file lands in the existing `avatars` bucket under {user_id}/…,
 * and a row is recorded in user_images so it can be re-picked later.
 */
export async function uploadCharacterImageAction(
  formData: FormData,
): Promise<UploadImageResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No image was provided." };
  }

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const admin = getServiceRoleSupabase();
  const path = `${user.id}/char-${Date.now()}.jpg`;
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(path, bytes, {
      upsert: true,
      contentType: file.type || "image/jpeg",
      cacheControl: "3600",
    });
  if (uploadError) return { ok: false, error: uploadError.message };

  const {
    data: { publicUrl },
  } = admin.storage.from("avatars").getPublicUrl(path);

  const { data: row, error: insertError } = await admin
    .from("user_images")
    .insert({ user_id: user.id, url: publicUrl })
    .select("id, url")
    .single();
  if (insertError || !row) {
    return {
      ok: false,
      error: insertError?.message ?? "Could not save the image.",
    };
  }

  return { ok: true, image: { id: row.id, url: row.url } };
}

export type ListImagesResult =
  | { ok: true; images: LibImage[] }
  | { ok: false; error: string };

/** The current user's image library, newest first. */
export async function listMyImagesAction(): Promise<ListImagesResult> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { data, error } = await supabase
    .from("user_images")
    .select("id, url")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true, images: data ?? [] };
}

export type SimpleResult = { ok: true } | { ok: false; error: string };

/**
 * Remove an image from the user's library. Leaves the storage object and
 * any campaign that already references the URL untouched.
 */
export async function deleteUserImageAction(
  id: string,
): Promise<SimpleResult> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { error } = await supabase
    .from("user_images")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type SetCharacterInput = {
  characterName: string;
  avatarUrl: string | null;
};

/**
 * Set the current user's per-campaign character name + portrait. Goes
 * through the service role AFTER verifying membership, and updates ONLY
 * the character fields — never role / is_dm — so it can't be used to
 * self-promote.
 */
export async function setCampaignCharacterAction(
  campaignId: string,
  input: SetCharacterInput,
): Promise<SimpleResult> {
  const name = input.characterName.trim();
  if (!name) return { ok: false, error: "A character name is required." };

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { data: membership } = await supabase
    .from("campaign_members")
    .select("user_id")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) {
    return { ok: false, error: "You are not a member of this campaign." };
  }

  const admin = getServiceRoleSupabase();
  const { error } = await admin
    .from("campaign_members")
    .update({ character_name: name, avatar_url: input.avatarUrl })
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
