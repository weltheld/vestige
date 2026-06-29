// Re-export from the shared package. Kept as a thin shim so existing
// `@/lib/supabase/env` imports across the app continue to work.
export {
  publicSupabaseUrl,
  publicSupabaseAnonKey,
  serviceRoleKey,
  siteUrl,
} from "@vestige/db";
