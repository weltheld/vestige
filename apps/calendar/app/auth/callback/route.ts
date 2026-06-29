import { NextResponse, type NextRequest } from "next/server";
import {
  getServerSupabase,
  getServiceRoleSupabase,
} from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/profile";

  if (!code) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", "missing_code");
    return NextResponse.redirect(url);
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", "exchange_failed");
    url.searchParams.set("message", error.message);
    return NextResponse.redirect(url);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await autoEnroll(user.id, user.email ?? "", next);
  }

  const target = await resolveDestination(supabase, next);
  return NextResponse.redirect(new URL(target, origin));
}

/**
 * Enrol the signed-in user into campaigns they were invited to, so following
 * an invite "just works":
 *  - Email invitations addressed to their address are claimed → membership.
 *  - A magic invite link (next=/g/<slug>) joins them to that campaign.
 * In-app invites of existing users (which carry a user_id, no email) are left
 * untouched — those still go through the explicit Accept/Decline flow on /home.
 */
async function autoEnroll(userId: string, email: string, next: string) {
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

  if (next.startsWith("/g/")) {
    const slug = next.slice(3).split(/[/?#]/)[0];
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
 * Decide where to land after a magic-link sign-in:
 * - New/incomplete profile → onboarding (/profile).
 * - Explicit destination (e.g. an invite link) → honour it.
 * - Otherwise (a normal returning login) → their campaign calendar, or /home.
 */
async function resolveDestination(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  next: string,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/login";

  const { data: profile } = await supabase
    .from("profiles")
    .select("character_name, display_name")
    .eq("id", user.id)
    .maybeSingle();
  const profileComplete = !!(
    profile?.character_name?.trim() && profile?.display_name?.trim()
  );

  if (!profileComplete) return "/profile";

  // Honour an explicit destination (invite links use next=/g/<slug>).
  if (next && next !== "/profile") return next;

  // Returning login → most recent campaign calendar, else the home list.
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
    if (campaign?.slug) return `/g/${campaign.slug}`;
  }
  return "/home";
}
