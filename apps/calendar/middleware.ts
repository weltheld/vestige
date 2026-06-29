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
     * - the auth callback (it handles its own session creation)
     */
    "/((?!_next/static|_next/image|favicon.ico|images/|auth/callback).*)",
  ],
};
