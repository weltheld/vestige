"use server";

import {
  getServerSupabase,
  getServiceRoleSupabase,
} from "@/lib/supabase/server";

export type SetSessionResult = { ok: true } | { ok: false; error: string };

/**
 * Mark (or unmark) a date as a game session for the campaign. Creator-only;
 * the write goes through the service role so it isn't blocked by RLS. The
 * upcoming/played distinction is derived from the date when rendering, so we
 * only store presence/absence here.
 */
export async function setSessionAction(
  campaignId: string,
  date: string,
  isSession: boolean,
): Promise<SetSessionResult> {
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
    return { ok: false, error: "Only the creator can mark sessions." };
  }

  const admin = getServiceRoleSupabase();
  if (isSession) {
    const { error } = await admin
      .from("campaign_sessions")
      .upsert(
        { campaign_id: campaignId, date },
        { onConflict: "campaign_id,date" },
      );
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await admin
      .from("campaign_sessions")
      .delete()
      .eq("campaign_id", campaignId)
      .eq("date", date);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}
