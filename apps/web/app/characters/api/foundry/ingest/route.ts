import { getServiceRoleSupabase } from "@vestige/db/server";
import { revalidatePath } from "next/cache";
import type { CharacterSheetData } from "@vestige/db";
import { parseFoundryActor } from "@/lib/characters/foundry";
import { collectImagePaths } from "@/lib/characters/art";
import { authorize, corsPreflight, json } from "@/lib/characters/foundry-api";
import { characters } from "@/lib/journal/links";

/**
 * Character sheet ingestion for the vestige-foundry module.
 *
 * Auth: `Authorization: Bearer <ingest_token>`.
 *
 * Body: the actor object exactly as Foundry's "Export Data" writes it —
 * `actor.toCompendium()` output, unmodified. Not a shape of the module's own
 * invention, deliberately: the same parser then serves both paths, and a
 * sheet pushed from the module is indistinguishable from one uploaded by
 * hand. `raw_data` keeps the export so a better parser can re-derive `data`
 * later without anyone re-pushing.
 *
 * Mirrors the importFoundryCharacter server action, including the upsert on
 * (campaign_id, foundry_actor_id) — pushing the same actor twice replaces its
 * sheet rather than adding a second one. The one difference is attribution:
 * the token identifies a campaign rather than a person, so the import is
 * recorded against the campaign's creator.
 *
 * Reachable at  <platform>/characters/api/foundry/ingest.
 */

/** Same ceiling as the manual import — a sanity limit on what goes into a
 *  jsonb column, not a judgement about any real sheet. */
const MAX_BYTES = 8_000_000;

export async function POST(req: Request) {
  const result = await authorize(req);
  if (!result.ok) return result.response;
  const { campaignId, creatorId, importCount } = result.auth;

  const text = await req.text();
  if (text.length > MAX_BYTES) {
    return json({ error: "That actor export is too large to import (over 8 MB)." }, 413);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return json({ error: "Body must be valid JSON — the Foundry actor export." }, 400);
  }

  const parsed = parseFoundryActor(raw);
  if (!parsed.ok) return json({ error: parsed.error }, 422);
  if (!parsed.actorId) {
    return json({ error: "This export has no actor id, so it can't be kept in sync." }, 422);
  }

  const admin = getServiceRoleSupabase();

  // Existing artwork is preserved across a re-push. The module uploads images
  // in a second step, and re-importing a sheet shouldn't blank the pictures
  // for every icon that hasn't changed.
  const { data: existing } = await admin
    .from("character_sheets")
    .select("id, data")
    .eq("campaign_id", campaignId)
    .eq("foundry_actor_id", parsed.actorId)
    .maybeSingle();

  const previousArt = (existing?.data as CharacterSheetData | undefined)?.art ?? {};
  const sheet: CharacterSheetData = { ...parsed.sheet, art: { ...previousArt } };

  const { data, error } = await admin
    .from("character_sheets")
    .upsert(
      {
        campaign_id: campaignId,
        foundry_actor_id: parsed.actorId,
        name: parsed.sheet.identity.name,
        data: sheet,
        raw_data: raw,
        imported_by: creatorId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "campaign_id,foundry_actor_id" },
    )
    .select("id, name")
    .single();

  if (error || !data) {
    return json({ error: error?.message ?? "Could not save the character sheet." }, 500);
  }

  await admin
    .from("foundry_connections")
    .update({ last_import_at: new Date().toISOString(), import_count: importCount + 1 })
    .eq("campaign_id", campaignId);

  revalidatePath(characters.campaign(campaignId));

  // `missingArt` is the point of the response: the module reads it and
  // uploads exactly those files, skipping every icon this campaign already
  // has. On a second character sharing stock art that is most of the list.
  const wanted = collectImagePaths(sheet);
  const missingArt = wanted.filter((path) => !sheet.art?.[path]);

  return json(
    {
      ok: true,
      sheetId: data.id,
      name: data.name,
      replaced: !!existing,
      missingArt,
    },
    existing ? 200 : 201,
  );
}

export function OPTIONS() {
  return corsPreflight();
}
