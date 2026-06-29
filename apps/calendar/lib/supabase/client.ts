// Re-export from the shared package. Kept as a thin shim so existing
// `@/lib/supabase/client` imports across the app continue to work.
export { getBrowserSupabase } from "@vestige/db/client";
