import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { publicSupabaseAnonKey, publicSupabaseUrl, serviceRoleKey } from "./env";

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 * Reads + writes the auth cookie so the user's session is honoured.
 *
 * Wrapped in React's `cache()` so every call within one request/render pass
 * returns the SAME client instance — that's what lets request-scoped
 * memoization of downstream reads (e.g. `getViewer`, wrapped in `cache()`
 * too) actually dedupe, instead of re-running the same query once per
 * layout/page that happens to call it.
 */
export const getServerSupabase = cache(async () => {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    publicSupabaseUrl(),
    publicSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components can't mutate cookies — Next throws there.
            // The middleware session refresh handles it.
          }
        },
      },
    },
  );
});

/**
 * Service-role client. Bypasses RLS. Only call from server code that has
 * already authorised the action (never from Client Components).
 */
export function getServiceRoleSupabase() {
  return createClient<Database>(publicSupabaseUrl(), serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
