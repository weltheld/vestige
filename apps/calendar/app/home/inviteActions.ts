"use server";

import { revalidatePath } from "next/cache";
import {
  getServerSupabase,
  getServiceRoleSupabase,
} from "@/lib/supabase/server";

export type InviteResponseResult = { ok: true } | { ok: false; error: string };

function invitationBelongsToUser(
  inv: { user_id: string | null; email: string | null },
  userId: string,
  email: string,
) {
  if (inv.user_id && inv.user_id === userId) return true;
  if (inv.email && inv.email.toLowerCase() === email.toLowerCase()) return true;
  return false;
}

/** Accept a pending invitation → become a player member of the campaign. */
export async function acceptInvitationAction(
  invitationId: string,
): Promise<InviteResponseResult> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const admin = getServiceRoleSupabase();
  const { data: inv } = await admin
    .from("invitations")
    .select("id, campaign_id, user_id, email, status")
    .eq("id", invitationId)
    .maybeSingle();
  if (!inv) return { ok: false, error: "Invitation not found." };
  if (!invitationBelongsToUser(inv, user.id, user.email ?? "")) {
    return { ok: false, error: "This invitation isn't addressed to you." };
  }

  const { error: memberError } = await admin
    .from("campaign_members")
    .upsert(
      {
        campaign_id: inv.campaign_id,
        user_id: user.id,
        role: "participant",
        is_dm: false,
      },
      { onConflict: "campaign_id,user_id", ignoreDuplicates: true },
    );
  if (memberError) return { ok: false, error: memberError.message };

  await admin
    .from("invitations")
    .update({ status: "joined", user_id: user.id })
    .eq("id", invitationId);

  revalidatePath("/home");
  return { ok: true };
}

/** Decline a pending invitation → remove it without joining. */
export async function declineInvitationAction(
  invitationId: string,
): Promise<InviteResponseResult> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const admin = getServiceRoleSupabase();
  const { data: inv } = await admin
    .from("invitations")
    .select("id, user_id, email")
    .eq("id", invitationId)
    .maybeSingle();
  if (!inv) return { ok: true }; // already gone
  if (!invitationBelongsToUser(inv, user.id, user.email ?? "")) {
    return { ok: false, error: "This invitation isn't addressed to you." };
  }

  await admin.from("invitations").delete().eq("id", invitationId);
  revalidatePath("/home");
  return { ok: true };
}
