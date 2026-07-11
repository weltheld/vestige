import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@vestige/db";
import { getServiceRoleSupabase } from "@vestige/db/server";
import { BASE_PATH, withBasePath } from "@/lib/calendar/basePath";

/**
 * Enrol a signed-in user into campaigns they were invited to, so following an
 * invite "just works" — used both by the magic-link auth callback (a brand
 * new or returning-but-signed-out visitor) and by the login page's
 * already-signed-in short-circuit (an existing member clicking the same
 * invite link from another tab/session, with no re-auth needed):
 *  - Email invitations addressed to their address are claimed → membership.
 *  - A magic invite link (next=/g/<slug>) joins them to that campaign.
 * In-app invites of existing users (which carry a user_id, no email) are left
 * untouched — those still go through the explicit Accept/Decline flow on the
 * unified platform home (PLATFORM_URL/app).
 */
export async function autoEnroll(userId: string, email: string, next: string) {
  const admin = getServiceRoleSupabase();

  if (email) {
    const { data: invites } = await admin
      .from("invitations")
      .select("id, campaign_id")
      .not("email", "is", null)
      .neq("status", "joined")
      .ilike("email", email);
    for (const inv of invites ?? []) {
      await admin.from("campaign_members").upsert(
        {
          campaign_id: inv.campaign_id,
          user_id: userId,
          role: "participant",
          is_dm: false,
        },
        { onConflict: "campaign_id,user_id", ignoreDuplicates: true },
      );
      await admin
        .from("invitations")
        .update({ status: "joined", user_id: userId })
        .eq("id", inv.id);
    }
  }

  // Accept both the historic unprefixed form ("/g/<slug>", still carried by
  // older magic-link emails) and the merged app's real path.
  const gPath = next.startsWith(`${BASE_PATH}/g/`)
    ? next.slice(BASE_PATH.length)
    : next;
  if (gPath.startsWith("/g/")) {
    const slug = gPath.slice(3).split(/[/?#]/)[0];
    if (slug) {
      const { data: campaign } = await admin
        .from("campaigns")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (campaign) {
        await admin.from("campaign_members").upsert(
          {
            campaign_id: campaign.id,
            user_id: userId,
            role: "participant",
            is_dm: false,
          },
          { onConflict: "campaign_id,user_id", ignoreDuplicates: true },
        );
      }
    }
  }
}

/**
 * Decide where to land after sign-in (or after an already-authenticated
 * enrol short-circuit):
 * - New/incomplete profile → onboarding (/calendar/profile).
 * - Explicit destination (e.g. an invite link) → honour it.
 * - Otherwise (a normal returning login) → their campaign calendar, or the
 *   platform home (/app) if they're in no campaign.
 *
 * Returns a FULLY-PREFIXED app-relative path (or an absolute URL) — callers
 * must NOT wrap it in withBasePath() again. `next` values stay in Calendar's
 * historic unprefixed form ("/g/<slug>") because in-flight magic-link emails
 * carry them; the prefix is added here, at the moment they become real URLs.
 */
export async function resolveDestination(
  supabase: SupabaseClient<Database>,
  next: string,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return withBasePath("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("character_name, display_name")
    .eq("id", user.id)
    .maybeSingle();
  const profileComplete = !!(
    profile?.character_name?.trim() && profile?.display_name?.trim()
  );

  if (!profileComplete) return withBasePath("/profile");

  // Honour an explicit destination (invite links use next=/g/<slug>).
  if (next && next !== "/profile") {
    return next.startsWith("http") || next.startsWith(BASE_PATH)
      ? next
      : withBasePath(next);
  }

  // Returning login → most recent campaign calendar, else the platform home.
  const { data: membership } = await supabase
    .from("campaign_members")
    .select("campaign_id")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (membership?.campaign_id) {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("slug")
      .eq("id", membership.campaign_id)
      .maybeSingle();
    if (campaign?.slug) return withBasePath(`/g/${campaign.slug}`);
  }
  return "/app";
}
