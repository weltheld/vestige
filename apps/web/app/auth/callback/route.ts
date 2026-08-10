import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@vestige/db";
import { publicSupabaseAnonKey, publicSupabaseUrl } from "@vestige/db";
import { getServiceRoleSupabase } from "@vestige/db/server";
import { redeemJoinCodeForUser } from "@/lib/joinCode";

/**
 * Magic-link callback. Supabase redirects here with a `?code=` (PKCE).
 * We exchange it for a session (writing the auth cookies) and then send the
 * user on to their intended destination.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/app";

  if (!code) {
    return NextResponse.redirect(`${origin}/signin?error=missing_code`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    publicSupabaseUrl(),
    publicSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/signin?error=${encodeURIComponent(error.message)}`,
    );
  }

  // A code entered at sign-up (see SignUpForm) rides along in the new
  // session's own metadata rather than being redeemed at sign-up time —
  // there's no session yet to attach a campaign membership to until this
  // exchange actually succeeds. A sign-IN (existing account, no fresh
  // metadata) never carries one, so this only ever fires once, right after
  // the account it was meant for actually starts existing.
  const joinCode = data.user?.user_metadata?.join_code;
  if (typeof joinCode === "string" && joinCode.trim() && data.user) {
    const admin = getServiceRoleSupabase();
    await redeemJoinCodeForUser(admin, data.user.id, joinCode);
    // Metadata otherwise carries forward on every future OTP request for
    // this email, which would re-run the redemption (harmlessly, but
    // pointlessly) on every sign-in from here on.
    await admin.auth.admin.updateUserById(data.user.id, {
      user_metadata: { ...data.user.user_metadata, join_code: null },
    });
  }

  return NextResponse.redirect(`${origin}${next}`);
}
