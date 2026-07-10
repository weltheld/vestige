"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase, getServiceRoleSupabase } from "@vestige/db/server";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://vestige-web-pi.vercel.app";

/** After accepting, land on the platform campaign entry (which routes into
 *  whichever module the campaign has enabled). */
function inviteRedirectTo(campaignId: string) {
  return `${WEB_URL}/auth/callback?next=${encodeURIComponent(`/app/c/${campaignId}`)}`;
}

type Guard =
  | { ok: false; error: string }
  | { ok: true; supabase: Awaited<ReturnType<typeof getServerSupabase>>; user: { id: string } };

async function creatorGuard(campaignId: string): Promise<Guard> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, creator_id")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return { ok: false, error: "Campaign not found." };
  if (campaign.creator_id !== user.id) {
    return { ok: false, error: "Only the campaign creator can manage invites." };
  }
  return { ok: true, supabase, user };
}

export type SendInviteResult = { ok: true; emailed: boolean } | { ok: false; error: string };

export async function sendInvite(campaignId: string, rawEmail: string): Promise<SendInviteResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, error: "Enter a valid email address." };

  const guard = await creatorGuard(campaignId);
  if (!guard.ok) return { ok: false, error: guard.error };
  const { supabase } = guard;

  // Already a platform user? Link by user_id, no email (they see it next login).
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("invitations")
      .insert({ campaign_id: campaignId, user_id: existing.id, status: "sent" });
    if (error && !error.message.includes("duplicate")) return { ok: false, error: error.message };
    revalidatePath(`/app/c/${campaignId}/manage`);
    return { ok: true, emailed: false };
  }

  const { error: insErr } = await supabase
    .from("invitations")
    .insert({ campaign_id: campaignId, email, status: "queued" });
  if (insErr && !insErr.message.includes("duplicate")) return { ok: false, error: insErr.message };

  const admin = getServiceRoleSupabase();
  const { error: emailErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: inviteRedirectTo(campaignId),
  });
  if (emailErr) return { ok: false, error: emailErr.message };

  await supabase
    .from("invitations")
    .update({ status: "sent" })
    .eq("campaign_id", campaignId)
    .eq("email", email);
  revalidatePath(`/app/c/${campaignId}/manage`);
  return { ok: true, emailed: true };
}

export type SimpleResult = { ok: true } | { ok: false; error: string };

export async function resendInvite(campaignId: string, invitationId: string): Promise<SimpleResult> {
  const guard = await creatorGuard(campaignId);
  if (!guard.ok) return { ok: false, error: guard.error };
  const { supabase } = guard;

  const { data: invitation } = await supabase
    .from("invitations")
    .select("id, email, user_id")
    .eq("id", invitationId)
    .maybeSingle();
  if (!invitation || !invitation.email || invitation.user_id) {
    return { ok: false, error: "This invite has no email link to resend." };
  }

  const admin = getServiceRoleSupabase();
  const { error } = await admin.auth.admin.inviteUserByEmail(invitation.email, {
    redirectTo: inviteRedirectTo(campaignId),
  });
  if (error) return { ok: false, error: error.message };

  await supabase.from("invitations").update({ status: "sent" }).eq("id", invitationId);
  revalidatePath(`/app/c/${campaignId}/manage`);
  return { ok: true };
}

export async function cancelInvite(campaignId: string, invitationId: string): Promise<SimpleResult> {
  const guard = await creatorGuard(campaignId);
  if (!guard.ok) return { ok: false, error: guard.error };
  const { error } = await guard.supabase.from("invitations").delete().eq("id", invitationId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/c/${campaignId}/manage`);
  return { ok: true };
}

/** Creator removes another member. The creator can't remove themselves this
 *  way (they'd orphan the campaign — deletion is a separate action). */
export async function removeMember(campaignId: string, userId: string): Promise<SimpleResult> {
  const guard = await creatorGuard(campaignId);
  if (!guard.ok) return { ok: false, error: guard.error };
  if (userId === guard.user.id) {
    return { ok: false, error: "The campaign owner can't remove themselves." };
  }

  const admin = getServiceRoleSupabase();
  const { error } = await admin
    .from("campaign_members")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  // Any lingering invitation shouldn't silently re-add them on next visit.
  await admin.from("invitations").delete().eq("campaign_id", campaignId).eq("user_id", userId);

  revalidatePath(`/app/c/${campaignId}/manage`);
  return { ok: true };
}

/** A member leaves a campaign they belong to. The creator can't leave (they
 *  own it) — they'd delete it instead. */
export async function leaveCampaign(campaignId: string): Promise<SimpleResult> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, creator_id")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return { ok: false, error: "Campaign not found." };
  if (campaign.creator_id === user.id) {
    return { ok: false, error: "The campaign owner can't leave — delete the campaign instead." };
  }

  const admin = getServiceRoleSupabase();
  const { error } = await admin
    .from("campaign_members")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  await admin.from("invitations").delete().eq("campaign_id", campaignId).eq("user_id", user.id);
  return { ok: true };
}

export async function addExistingMember(campaignId: string, userId: string): Promise<SimpleResult> {
  const guard = await creatorGuard(campaignId);
  if (!guard.ok) return { ok: false, error: guard.error };
  const { user } = guard;

  const admin = getServiceRoleSupabase();
  const { data: prof } = await admin
    .from("profiles")
    .select("id, email")
    .eq("id", userId)
    .maybeSingle();
  if (!prof) return { ok: false, error: "User not found." };

  // Only people this creator invited (to any of their campaigns) may be added.
  const { data: myCampaigns } = await admin
    .from("campaigns")
    .select("id")
    .eq("creator_id", user.id);
  const myIds = (myCampaigns ?? []).map((c) => c.id);
  if (myIds.length === 0) return { ok: false, error: "You can only add people you invited." };

  const { data: byUser } = await admin
    .from("invitations")
    .select("id")
    .in("campaign_id", myIds)
    .eq("user_id", userId)
    .limit(1);
  let invited = (byUser?.length ?? 0) > 0;
  if (!invited && prof.email) {
    const { data: byEmail } = await admin
      .from("invitations")
      .select("id")
      .in("campaign_id", myIds)
      .ilike("email", prof.email)
      .limit(1);
    invited = (byEmail?.length ?? 0) > 0;
  }
  if (!invited) return { ok: false, error: "You can only add people you invited." };

  const { error } = await admin
    .from("campaign_members")
    .upsert(
      { campaign_id: campaignId, user_id: userId, role: "participant", is_dm: false },
      { onConflict: "campaign_id,user_id", ignoreDuplicates: true },
    );
  if (error) return { ok: false, error: error.message };

  await admin
    .from("invitations")
    .update({ status: "joined", user_id: userId })
    .eq("campaign_id", campaignId)
    .eq("user_id", userId);
  if (prof.email) {
    await admin
      .from("invitations")
      .update({ status: "joined", user_id: userId })
      .eq("campaign_id", campaignId)
      .ilike("email", prof.email);
  }
  revalidatePath(`/app/c/${campaignId}/manage`);
  return { ok: true };
}
