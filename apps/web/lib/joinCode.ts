import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@vestige/db";

export type RedeemJoinCodeResult =
  | { ok: true; campaignName: string; alreadyMember: boolean }
  | { ok: false; error: string };

/**
 * Add a user to the campaign a join code names, or say why not.
 *
 * Shared by the redeem-from-/app form (an already-signed-in user typing a
 * code) and the sign-up flow (a code carried through the magic-link's
 * metadata, redeemed the moment the new account's session actually
 * exists) — same rule either way: a code that doesn't exist, or a
 * duplicate membership, gets reported the same way regardless of which
 * screen sent the user here.
 *
 * Takes the service-role client, not the caller's own — the code lookup
 * and the campaign row it names aren't visible to a non-member via RLS.
 */
export async function redeemJoinCodeForUser(
  admin: SupabaseClient<Database>,
  userId: string,
  rawCode: string,
): Promise<RedeemJoinCodeResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a code." };

  const { data: joinCode } = await admin
    .from("campaign_join_codes")
    .select("campaign_id")
    .eq("code", code)
    .maybeSingle();
  if (!joinCode) return { ok: false, error: "That code doesn't match any campaign." };

  const { data: campaign } = await admin
    .from("campaigns")
    .select("id, name")
    .eq("id", joinCode.campaign_id)
    .maybeSingle();
  if (!campaign) return { ok: false, error: "That code doesn't match any campaign." };

  const { data: existingMember } = await admin
    .from("campaign_members")
    .select("user_id")
    .eq("campaign_id", campaign.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (existingMember) {
    return { ok: true, campaignName: campaign.name, alreadyMember: true };
  }

  const { error } = await admin
    .from("campaign_members")
    .upsert(
      { campaign_id: campaign.id, user_id: userId, role: "participant", is_dm: false },
      { onConflict: "campaign_id,user_id", ignoreDuplicates: true },
    );
  if (error) return { ok: false, error: error.message };

  return { ok: true, campaignName: campaign.name, alreadyMember: false };
}
