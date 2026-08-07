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
 * Pushed sheets land in the owner's library by default, and which campaign
 * they belong to is chosen in Vestige afterwards. The upsert is keyed on
 * (owner_id, foundry_actor_id), and normally never writes campaign_id or
 * player_id — pushing after every session updates the character in place and
 * leaves the filing alone, which is the point of doing it this way.
 *
 * The module's Campaign Manager is the exception: a sync from there sends
 * `flags.vestige.campaignId` in the export, naming the paired campaign to
 * file straight into. Honoured only after confirming the token's owner is
 * actually a member of that campaign — a stale pairing (removed from the
 * campaign since) is silently ignored rather than trusted, and the response
 * says so via `campaignId: null` so the module can warn instead of assuming
 * it worked. Only an actual MOVE to a different campaign clears the player
 * allocation, same as unfiling a sheet manually does — the old campaign's
 * roster has no bearing on the new one. Syncing again to the SAME campaign
 * (the normal case — every session after the first) leaves it alone, so the
 * DM does not have to reassign who plays a character after every sync.
 *
 * Reachable at  <platform>/characters/api/foundry/ingest.
 */

/** Same ceiling as the manual import — a sanity limit on what goes into a
 *  jsonb column, not a judgement about any real sheet. */
const MAX_BYTES = 8_000_000;

export async function POST(req: Request) {
  const result = await authorize(req);
  if (!result.ok) return result.response;
  const { ownerId, importCount } = result.auth;

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

  // Existing artwork — and a hand-uploaded portrait, if there is one — is
  // preserved across a re-push. The module uploads images in a second step,
  // and re-importing a sheet shouldn't blank the pictures for every icon
  // that hasn't changed, or replace a portrait the player set themselves.
  const { data: existing } = await admin
    .from("character_sheets")
    .select("id, data, campaign_id")
    .eq("owner_id", ownerId)
    .eq("foundry_actor_id", parsed.actorId)
    .maybeSingle();

  const previousData = existing?.data as CharacterSheetData | undefined;
  const sheet: CharacterSheetData = {
    ...parsed.sheet,
    art: { ...(previousData?.art ?? {}) },
    manualPortraitUrl: previousData?.manualPortraitUrl,
  };

  // A sync from the Campaign Manager names its target campaign here. Trusted
  // only once membership is confirmed — anyone could otherwise name a
  // campaign id they have no business filing into.
  const requestedCampaignId =
    typeof (raw as { flags?: { vestige?: { campaignId?: unknown } } })?.flags?.vestige
      ?.campaignId === "string"
      ? (raw as { flags: { vestige: { campaignId: string } } }).flags.vestige.campaignId
      : null;

  let targetCampaignId: string | null = null;
  if (requestedCampaignId) {
    const { data: membership } = await admin
      .from("campaign_members")
      .select("campaign_id")
      .eq("campaign_id", requestedCampaignId)
      .eq("user_id", ownerId)
      .maybeSingle();
    if (membership) targetCampaignId = requestedCampaignId;
  }

  // campaign_id and player_id are left untouched on an ordinary push — the
  // filing is Vestige's, and a push that undid it would make syncing after
  // each session a chore rather than the point. A validated campaign target
  // writes campaign_id, but player_id is only cleared when that target is
  // DIFFERENT from where the sheet already was — moving it. Syncing again to
  // the same campaign (every session after the first) must not touch it, or
  // the DM would have to reassign the player after every single sync, which
  // is exactly the busywork this feature exists to remove.
  const isMove = !!targetCampaignId && targetCampaignId !== existing?.campaign_id;
  const { data, error } = await admin
    .from("character_sheets")
    .upsert(
      {
        owner_id: ownerId,
        foundry_actor_id: parsed.actorId,
        name: parsed.sheet.identity.name,
        data: sheet,
        raw_data: raw,
        imported_by: ownerId,
        updated_at: new Date().toISOString(),
        ...(targetCampaignId ? { campaign_id: targetCampaignId } : {}),
        ...(isMove ? { player_id: null } : {}),
      },
      { onConflict: "owner_id,foundry_actor_id" },
    )
    .select("id, name, campaign_id")
    .single();

  if (error || !data) {
    return json({ error: error?.message ?? "Could not save the character sheet." }, 500);
  }

  await admin
    .from("foundry_connections")
    .update({ last_import_at: new Date().toISOString(), import_count: importCount + 1 })
    .eq("owner_id", ownerId);

  revalidatePath(characters.library());
  if (existing?.campaign_id) revalidatePath(characters.campaign(existing.campaign_id));
  if (data.campaign_id && data.campaign_id !== existing?.campaign_id) {
    revalidatePath(characters.campaign(data.campaign_id));
  }

  // `missingArt` is the point of the response: the module reads it and
  // uploads exactly those files, skipping every icon this campaign already
  // has. On a second character sharing stock art that is most of the list.
  //
  // `wantedArt` is everything the sheet references, for the module's
  // re-send option — artwork is matched by PATH, so a file edited in place
  // keeps its path and never shows up as missing. Rare enough that detecting
  // it on every push (hashing every referenced file) would cost more than it
  // saves; explicit enough that asking for it is easy.
  const wantedArt = collectImagePaths(sheet);
  const missingArt = wantedArt.filter((path) => !sheet.art?.[path]);

  return json(
    {
      ok: true,
      sheetId: data.id,
      name: data.name,
      replaced: !!existing,
      // So the module can say "sitting in your library" versus "updated in
      // <campaign>" rather than leaving the user to go and look.
      filed: !!data.campaign_id,
      // Echoes back what actually got applied, not just what was asked for —
      // null here despite a campaignId in the request means the pairing is
      // stale (no longer a member of that campaign) and the module should
      // say so rather than reporting a sync that didn't really happen.
      campaignId: data.campaign_id,
      missingArt,
      wantedArt,
    },
    existing ? 200 : 201,
  );
}

export function OPTIONS() {
  return corsPreflight();
}
