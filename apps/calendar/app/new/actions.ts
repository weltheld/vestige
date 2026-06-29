"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  getServerSupabase,
  getServiceRoleSupabase,
} from "@/lib/supabase/server";
import { siteUrl } from "@/lib/supabase/env";

export type CreateCampaignResult =
  | { ok: true; id: string; slug: string; name: string }
  | { ok: false; error: string };

export async function createCampaignAction(
  name: string,
): Promise<CreateCampaignResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Campaign name is required." };

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/new");

  const admin = getServiceRoleSupabase();

  const { data: campaign, error } = await admin
    .from("campaigns")
    .insert({ name: trimmed, creator_id: user.id })
    .select("id, slug, name")
    .single();

  if (error || !campaign) {
    return { ok: false, error: error?.message ?? "Could not create campaign." };
  }

  const { error: memberError } = await admin
    .from("campaign_members")
    .insert({
      campaign_id: campaign.id,
      user_id: user.id,
      role: "creator",
      is_dm: true,
    });
  if (memberError) {
    return { ok: false, error: memberError.message };
  }

  revalidatePath("/new");
  return { ok: true, ...campaign };
}

export type ToggleInviteResult =
  | { ok: true; invited: boolean }
  | { ok: false; error: string };

export async function toggleInviteExistingUserAction(
  campaignId: string,
  userId: string,
): Promise<ToggleInviteResult> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Currently invited?
  const { data: existing } = await supabase
    .from("invitations")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("invitations")
      .delete()
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/new");
    return { ok: true, invited: false };
  }

  const { error } = await supabase.from("invitations").insert({
    campaign_id: campaignId,
    user_id: userId,
    status: "queued",
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/new");
  return { ok: true, invited: true };
}

export type InviteByEmailResult =
  | { ok: true }
  | { ok: false; error: string };

export async function inviteByEmailAction(
  campaignId: string,
  rawEmail: string,
): Promise<InviteByEmailResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!email.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Already a platform user? -> link by user_id.
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  const insertPayload: {
    campaign_id: string;
    user_id: string | null;
    email: string | null;
    status: "queued";
  } = existingProfile
    ? {
        campaign_id: campaignId,
        user_id: existingProfile.id,
        email: null,
        status: "queued",
      }
    : {
        campaign_id: campaignId,
        user_id: null,
        email,
        status: "queued",
      };

  const { error } = await supabase.from("invitations").insert(insertPayload);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/new");
  return { ok: true };
}

/** Flip phase from 'draft' to 'live' and dispatch invitations. */
export type LaunchCampaignResult =
  | { ok: true; slug: string; emailsSent: number; emailErrors: string[] }
  | { ok: false; error: string };

export async function launchCampaignAction(
  campaignId: string,
): Promise<LaunchCampaignResult> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify caller is creator (RLS will also enforce on update).
  const { data: campaign, error: campErr } = await supabase
    .from("campaigns")
    .select("slug, creator_id")
    .eq("id", campaignId)
    .single();
  if (campErr || !campaign) {
    return { ok: false, error: campErr?.message ?? "Campaign not found." };
  }
  if (campaign.creator_id !== user.id) {
    return { ok: false, error: "Only the creator can launch." };
  }

  const { error: phaseErr } = await supabase
    .from("campaigns")
    .update({ phase: "live" })
    .eq("id", campaignId);
  if (phaseErr) return { ok: false, error: phaseErr.message };

  // Dispatch invitation emails to brand-new email targets.
  const { data: invitations } = await supabase
    .from("invitations")
    .select("id, email, user_id, status")
    .eq("campaign_id", campaignId)
    .eq("status", "queued");

  const emailErrors: string[] = [];
  let emailsSent = 0;

  if (invitations && invitations.length > 0) {
    const admin = getServiceRoleSupabase();
    const baseUrl = siteUrl();
    for (const inv of invitations) {
      if (inv.email && !inv.user_id) {
        const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
          inv.email,
          { redirectTo: `${baseUrl}/auth/callback?next=/g/${campaign.slug}` },
        );
        if (inviteErr) {
          emailErrors.push(`${inv.email}: ${inviteErr.message}`);
        } else {
          emailsSent += 1;
        }
      }
      // Existing-user invitations: nothing to email; they'll see the
      // pending invite in their dashboard the next time they log in.
      await supabase
        .from("invitations")
        .update({ status: "sent" })
        .eq("id", inv.id);
    }
  }

  revalidatePath(`/g/${campaign.slug}`);
  return { ok: true, slug: campaign.slug, emailsSent, emailErrors };
}
