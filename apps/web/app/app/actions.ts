"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase, getServiceRoleSupabase } from "@vestige/db/server";

export type RedeemResult = { ok: true; campaignName: string } | { ok: false; error: string };

/** Join a campaign by its short code (shown to the creator on the Manage
 *  Campaign screen) — the low-friction alternative to a magic-link invite.
 *  Uses the service role because the code lookup and the campaign row
 *  aren't otherwise visible to a non-member. */
export async function redeemJoinCode(rawCode: string): Promise<RedeemResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a code." };

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const admin = getServiceRoleSupabase();
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

  const { error } = await admin
    .from("campaign_members")
    .upsert(
      { campaign_id: campaign.id, user_id: user.id, role: "participant", is_dm: false },
      { onConflict: "campaign_id,user_id", ignoreDuplicates: true },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app");
  return { ok: true, campaignName: campaign.name };
}
