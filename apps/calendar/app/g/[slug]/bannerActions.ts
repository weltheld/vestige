"use server";

import {
  getServerSupabase,
  getServiceRoleSupabase,
} from "@/lib/supabase/server";

export type UploadBannerResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Upload a campaign banner. Authorisation is checked here (creator only),
 * then the write goes through the service-role client so it isn't blocked
 * by storage RLS.
 */
export async function uploadBannerAction(
  campaignId: string,
  formData: FormData,
): Promise<UploadBannerResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No image was provided." };
  }
  const original = formData.get("original");

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("creator_id")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign || campaign.creator_id !== user.id) {
    return { ok: false, error: "Only the creator can change the banner." };
  }

  const admin = getServiceRoleSupabase();
  const path = `${campaignId}/banner-${Date.now()}.jpg`;
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from("banners")
    .upload(path, bytes, {
      upsert: true,
      contentType: file.type || "image/jpeg",
      cacheControl: "3600",
    });
  if (uploadError) return { ok: false, error: uploadError.message };

  // Keep the full uploaded image so the crop can be re-selected later
  // without re-uploading. Stored at a deterministic path (overwritten).
  if (original instanceof File) {
    const obytes = await original.arrayBuffer();
    await admin.storage
      .from("banners")
      .upload(`${campaignId}/original`, obytes, {
        upsert: true,
        contentType: original.type || "image/jpeg",
        cacheControl: "3600",
      });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("banners").getPublicUrl(path);

  const { error: dbError } = await admin
    .from("campaigns")
    .update({ banner_url: publicUrl })
    .eq("id", campaignId);
  if (dbError) return { ok: false, error: dbError.message };

  return { ok: true, url: publicUrl };
}
