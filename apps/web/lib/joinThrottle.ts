import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@vestige/db";

const WINDOW_MINUTES = 15;
const MAX_MISSES = 10;

// join_attempts isn't in the generated Database types (it is service-role
// only and never read by the UI), so this works on an untyped client.
type Loose = SupabaseClient;

/** True once a user has missed too many join codes recently. Fails OPEN if
 *  the table is missing (migration not applied yet) so a deploy can't lock
 *  everyone out — the error is logged instead. */
export async function tooManyJoinMisses(admin: SupabaseClient<Database>, userId: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { count, error } = await (admin as unknown as Loose)
    .from("join_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) {
    console.error("[join-throttle] could not check attempts", error.message);
    return false;
  }
  return (count ?? 0) >= MAX_MISSES;
}

export async function recordJoinMiss(admin: SupabaseClient<Database>, userId: string): Promise<void> {
  const { error } = await (admin as unknown as Loose).from("join_attempts").insert({ user_id: userId });
  if (error) console.error("[join-throttle] could not record attempt", error.message);
}
