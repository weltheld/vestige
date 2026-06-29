"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  getServerSupabase,
  getServiceRoleSupabase,
} from "@/lib/supabase/server";
import { siteUrl } from "@/lib/supabase/env";

export type SendInviteResult =
  | { ok: true; emailed: boolean }
  | { ok: false; error: string };

export async function sendInviteAction(
  slug: string,
  rawEmail: string,
): Promise<SendInviteResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!email.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/g/${slug}/invite`);

  const { data: campaign, error: campErr } = await supabase
    .from("campaigns")
    .select("id, slug, creator_id")
    .eq("slug", slug)
    .maybeSingle();
  if (campErr || !campaign) {
    return { ok: false, error: "Campaign not found." };
  }
  if (campaign.creator_id !== user.id) {
    return { ok: false, error: "Only the creator can invite." };
  }

  // Already a platform user? Link by user_id and skip the magic email
  // (they'll see the invitation next login).
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    const { error } = await supabase.from("invitations").insert({
      campaign_id: campaign.id,
      user_id: existingProfile.id,
      status: "sent",
    });
    if (error && !error.message.includes("duplicate")) {
      return { ok: false, error: error.message };
    }
    revalidatePath(`/g/${slug}/invite`);
    return { ok: true, emailed: false };
  }

  // New email — record the invitation and dispatch a magic-link email.
  const { error: insertErr } = await supabase.from("invitations").insert({
    campaign_id: campaign.id,
    email,
    status: "queued",
  });
  if (insertErr && !insertErr.message.includes("duplicate")) {
    return { ok: false, error: insertErr.message };
  }

  const admin = getServiceRoleSupabase();
  const { error: emailErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/g/${slug}`,
  });
  if (emailErr) {
    return { ok: false, error: emailErr.message };
  }

  await supabase
    .from("invitations")
    .update({ status: "sent" })
    .eq("campaign_id", campaign.id)
    .eq("email", email);

  revalidatePath(`/g/${slug}/invite`);
  return { ok: true, emailed: true };
}

export type ResendInviteResult =
  | { ok: true }
  | { ok: false; error: string };

/** Re-send the magic-link email for a pending email invitation. */
export async function resendInviteAction(
  slug: string,
  invitationId: string,
): Promise<ResendInviteResult> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/g/${slug}/invite`);

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, slug, creator_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!campaign) return { ok: false, error: "Campaign not found." };
  if (campaign.creator_id !== user.id) {
    return { ok: false, error: "Only the creator can resend invites." };
  }

  const { data: invitation } = await supabase
    .from("invitations")
    .select("id, email, user_id")
    .eq("id", invitationId)
    .maybeSingle();
  if (!invitation || !invitation.email || invitation.user_id) {
    return {
      ok: false,
      error: "This invite has no email link to resend.",
    };
  }

  const admin = getServiceRoleSupabase();
  const { error: emailErr } = await admin.auth.admin.inviteUserByEmail(
    invitation.email,
    { redirectTo: `${siteUrl()}/auth/callback?next=/g/${slug}` },
  );
  if (emailErr) return { ok: false, error: emailErr.message };

  await supabase
    .from("invitations")
    .update({ status: "sent" })
    .eq("id", invitationId);

  revalidatePath(`/g/${slug}/invite`);
  return { ok: true };
}

export type AddExistingMemberResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Add a signed-up user directly to the campaign — but only if the current
 * creator had invited them (an invitation for that person exists in one of
 * the creator's campaigns).
 */
export async function addExistingMemberAction(
  slug: string,
  userId: string,
): Promise<AddExistingMemberResult> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/g/${slug}/invite`);

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, creator_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!campaign) return { ok: false, error: "Campaign not found." };
  if (campaign.creator_id !== user.id) {
    return { ok: false, error: "Only the creator can add members." };
  }

  const admin = getServiceRoleSupabase();
  const { data: prof } = await admin
    .from("profiles")
    .select("id, email")
    .eq("id", userId)
    .maybeSingle();
  if (!prof) return { ok: false, error: "User not found." };

  // Verify this person was invited by me (invitation in one of my campaigns).
  const { data: myCampaigns } = await admin
    .from("campaigns")
    .select("id")
    .eq("creator_id", user.id);
  const myIds = (myCampaigns ?? []).map((c) => c.id);
  if (myIds.length === 0) {
    return { ok: false, error: "You can only add people you invited." };
  }
  const { data: invByUser } = await admin
    .from("invitations")
    .select("id")
    .in("campaign_id", myIds)
    .eq("user_id", userId)
    .limit(1);
  let invitedByMe = (invByUser?.length ?? 0) > 0;
  if (!invitedByMe && prof.email) {
    const { data: invByEmail } = await admin
      .from("invitations")
      .select("id")
      .in("campaign_id", myIds)
      .ilike("email", prof.email)
      .limit(1);
    invitedByMe = (invByEmail?.length ?? 0) > 0;
  }
  if (!invitedByMe) {
    return { ok: false, error: "You can only add people you invited." };
  }

  const { error } = await admin.from("campaign_members").upsert(
    { campaign_id: campaign.id, user_id: userId, role: "participant", is_dm: false },
    { onConflict: "campaign_id,user_id", ignoreDuplicates: true },
  );
  if (error) return { ok: false, error: error.message };

  // Mark any matching invitation as joined so it doesn't linger.
  await admin
    .from("invitations")
    .update({ status: "joined", user_id: userId })
    .eq("campaign_id", campaign.id)
    .eq("user_id", userId);
  if (prof.email) {
    await admin
      .from("invitations")
      .update({ status: "joined", user_id: userId })
      .eq("campaign_id", campaign.id)
      .ilike("email", prof.email);
  }

  revalidatePath(`/g/${slug}/invite`);
  return { ok: true };
}

export async function cancelInviteAction(slug: string, invitationId: string) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/g/${slug}/invite`);

  const { error } = await supabase
    .from("invitations")
    .delete()
    .eq("id", invitationId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/g/${slug}/invite`);
  return { ok: true as const };
}
