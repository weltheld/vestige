"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { publicSupabaseAnonKey, publicSupabaseUrl } from "./env";

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Browser Supabase client (client components). Respects RLS as the user. */
export function getBrowserSupabase() {
  if (cached) return cached;
  cached = createBrowserClient<Database>(
    publicSupabaseUrl(),
    publicSupabaseAnonKey(),
  );
  return cached;
}
