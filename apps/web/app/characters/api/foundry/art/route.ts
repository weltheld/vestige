import { getServiceRoleSupabase } from "@vestige/db/server";
import { revalidatePath } from "next/cache";
import type { CharacterSheetData } from "@vestige/db";
import { isImage, storageKey } from "@/lib/characters/art";
import { authorize, corsPreflight, json } from "@/lib/characters/foundry-api";
import { characters } from "@/lib/journal/links";

/**
 * Artwork upload for the vestige-foundry module.
 *
 * The browser flow has to ask the player to find their Foundry folder,
 * because a page on vestige can't read their disk. The module has no such
 * problem: Foundry serves `icons/`, `systems/`, `modules/` and `worlds/` as
 * one URL space, so the module fetches each path the sheet references
 * straight from the server it is running inside and posts the bytes here.
 * No folder picker, and no "icons/ live with the application, not in Data"
 * to explain to anyone.
 *
 * Auth: `Authorization: Bearer <ingest_token>`.
 *
 * Body: multipart/form-data.
 *   sheetId            the id returned by /ingest
 *   <foundry path>     the file, keyed by the path the export refers to
 *                      ("icons/weapons/sword.webp"). Using the path as the
 *                      field name keeps each file tied to its path without a
 *                      parallel array to keep in step.
 *
 * Uploads go under {owner_id}/{sha1-of-path}.{ext} — the same key shape the
 * browser flow writes, but folded under the pusher rather than a campaign,
 * because a sheet in the library has no campaign yet. Both folders are
 * public-read and the sheet stores full URLs, so nothing downstream cares
 * which a picture came from. Keying on the source path still means the forty
 * items sharing one stock icon upload it once.
 *
 * Reachable at  <platform>/characters/api/foundry/art.
 */

const BUCKET = "character-art";

/** Per-request ceiling. The module batches, so this bounds one batch rather
 *  than a character's whole collection. */
const MAX_BYTES = 25_000_000;

export async function POST(req: Request) {
  const result = await authorize(req);
  if (!result.ok) return result.response;
  const { ownerId } = result.auth;

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) {
    return json({ error: "That batch is too large. Send fewer images per request." }, 413);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Body must be multipart/form-data." }, 400);
  }

  const sheetId = form.get("sheetId");
  if (typeof sheetId !== "string" || !sheetId) {
    return json({ error: "A `sheetId` field is required." }, 400);
  }

  const admin = getServiceRoleSupabase();
  const { data: sheetRow } = await admin
    .from("character_sheets")
    .select("id, data, campaign_id")
    .eq("id", sheetId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!sheetRow) {
    return json({ error: "Sheet not found, or not yours." }, 404);
  }

  const art: Record<string, string> = {};
  const rejected: string[] = [];
  const failed: Record<string, string> = {};

  for (const [field, value] of form.entries()) {
    if (field === "sheetId" || typeof value === "string") continue;
    const file = value as File;
    // The field name IS the Foundry path. Anything that isn't an image is
    // skipped rather than failing the batch — one odd path shouldn't cost the
    // other forty uploads.
    if (!isImage(field) && !isImage(file.name)) {
      rejected.push(field);
      continue;
    }

    const key = await storageKey(ownerId, field);
    const { error } = await admin.storage.from(BUCKET).upload(key, file, {
      upsert: true,
      contentType: file.type || undefined,
      cacheControl: "31536000",
    });
    // One image failing to store (a bucket problem, a transient error)
    // used to abort the whole request, silently losing every other image
    // already fetched in the same batch — including a portrait that would
    // otherwise have gone through fine. Recorded and skipped instead, so a
    // single bad file never costs its neighbours.
    if (error) {
      failed[field] = error.message;
      continue;
    }
    art[field] = admin.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
  }

  if (Object.keys(art).length === 0) {
    return json({ ok: true, added: 0, total: 0, rejected, failed });
  }

  // Merge, never replace — the module uploads in batches, and each batch has
  // to land on top of the last rather than start over.
  const data = sheetRow.data as CharacterSheetData;
  const merged = { ...(data.art ?? {}), ...art };
  const { error } = await admin
    .from("character_sheets")
    .update({ data: { ...data, art: merged }, updated_at: new Date().toISOString() })
    .eq("id", sheetId);
  if (error) return json({ error: error.message }, 500);

  revalidatePath(characters.library());
  if (sheetRow.campaign_id) revalidatePath(characters.campaign(sheetRow.campaign_id));
  return json({
    ok: true,
    added: Object.keys(art).length,
    total: Object.keys(merged).length,
    rejected,
    failed,
  });
}

export function OPTIONS() {
  return corsPreflight();
}
