import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthUser = { id: string; email: string | undefined };

/**
 * The id/email off the current session, verified the cheap way first.
 *
 * `getClaims()` verifies the JWT locally against the project's asymmetric
 * signing key — no network round trip, which is why it's used on every
 * page load and in middleware. But the very first verification on a cold
 * serverless instance has to fetch that key, and that fetch can fail. Left
 * unguarded, that failure crashed the whole page rather than just being
 * slow — most reliably right after a fresh sign-in, since the redirect
 * from /auth/callback lands on a function instance nothing has warmed yet.
 * Refreshing "fixed" it only because the retry landed on an instance that
 * already had the key cached.
 *
 * Only falls back to the slower, network-backed `getUser()` when
 * `getClaims()` itself throws — not when it cleanly resolves with no
 * claims, which is just an ordinary signed-out visitor and shouldn't cost
 * every anonymous page view an extra round trip to find that out.
 */
export async function getAuthUser(supabase: SupabaseClient): Promise<AuthUser | null> {
  try {
    const { data } = await supabase.auth.getClaims();
    return data?.claims ? { id: data.claims.sub, email: data.claims.email } : null;
  } catch {
    const { data } = await supabase.auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email } : null;
  }
}
