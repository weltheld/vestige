"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import { appHref } from "@/lib/links";

async function sb() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return supabase;
}

export async function renameCampaign(campaignId: string, name: string) {
  const supabase = await sb();
  const { error } = await supabase.from("campaigns").update({ name }).eq("id", campaignId);
  if (error) throw error;
  revalidatePath(`/c/${campaignId}/settings`);
}

export async function setMemberDm(campaignId: string, userId: string, isDm: boolean) {
  const supabase = await sb();
  const { error } = await supabase
    .from("campaign_members")
    .update({ is_dm: isDm })
    .eq("campaign_id", campaignId)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath(`/c/${campaignId}/settings`);
}

export async function removeMember(campaignId: string, userId: string) {
  const supabase = await sb();
  const { error } = await supabase
    .from("campaign_members")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath(`/c/${campaignId}/settings`);
}

/** Queue email invitations (creator-only via RLS). Delivery is handled by the
 *  existing Council of Days invite pipeline / Supabase magic-link emails. */
export async function inviteMembers(campaignId: string, emails: string[]) {
  const supabase = await sb();
  const rows = emails
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"))
    .map((email) => ({ campaign_id: campaignId, email, status: "queued" as const }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("invitations").insert(rows);
  if (error) throw error;
  revalidatePath(`/c/${campaignId}/settings`);
}

export async function setModules(
  campaignId: string,
  modules: { calendar: boolean; journal: boolean },
) {
  const supabase = await sb();
  const { error } = await supabase
    .from("campaigns")
    .update({ modules_enabled: modules })
    .eq("id", campaignId);
  if (error) throw error;
  revalidatePath(`/c/${campaignId}/settings`);
}

export async function deleteCampaign(campaignId: string) {
  const supabase = await sb();
  const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);
  if (error) throw error;
  redirect(appHref());
}
