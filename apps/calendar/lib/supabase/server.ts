// Re-export from the shared package. Kept as a thin shim so existing
// `@/lib/supabase/server` imports across the app continue to work.
export { getServerSupabase, getServiceRoleSupabase } from "@vestige/db/server";
