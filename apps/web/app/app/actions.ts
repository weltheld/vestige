"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase, getServiceRoleSupabase } from "@vestige/db/server";
import { redeemJoinCodeForUser, type RedeemJoinCodeResult } from "@/lib/joinCode";

export type RedeemResult = RedeemJoinCodeResult;

/** Join a campaign by its short code (shown to the creator on the Manage
 *  Campaign screen) — the low-friction alternative to a magic-link invite.
 *  The actual lookup/membership logic is shared with the sign-up flow's own
 *  redemption (see lib/joinCode.ts) — this just adds the "must already be
 *  signed in" check that only applies to this entry point. */
export async function redeemJoinCode(rawCode: string): Promise<RedeemResult> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const result = await redeemJoinCodeForUser(getServiceRoleSupabase(), user.id, rawCode);
  if (result.ok) revalidatePath("/app");
  return result;
}
