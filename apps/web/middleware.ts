import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run middleware on every request except for:
     * - _next internals
     * - static assets in /public (images, favicon, etc.)
     * - both auth callbacks (they handle their own session creation) —
     *   the leading alternation is anchored at the first segment, so
     *   /calendar/auth/callback needs its own entry
     */
    "/((?!_next/static|_next/image|favicon.ico|images/|auth/callback|calendar/auth/callback).*)",
  ],
};
