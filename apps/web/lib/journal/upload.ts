"use client";

import { getBrowserSupabase } from "@vestige/db/client";

const BUCKET = "journal-images";

/** Uploads a file under {campaignId}/... and returns its public URL. */
export async function uploadJournalImage(campaignId: string, file: File): Promise<string> {
  const supabase = getBrowserSupabase();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${campaignId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Opens a native file picker and resolves with the chosen file, or null. */
export function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}
