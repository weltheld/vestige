import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { publicSupabaseAnonKey, publicSupabaseUrl } from "./env";
import { PLATFORM_URL } from "@/lib/basePath";

const PROTECTED_PATHS = ["/profile", "/new", "/g/", "/home"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicSupabaseUrl(),
    publicSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getClaims() verifies the JWT locally against the project's asymmetric
  // signing key (no network round trip) instead of asking the Auth server —
  // this runs on every request, so it's the highest-value spot to avoid it.
  const {
    data,
  } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (!user && needsAuth) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === "/" || pathname === "/login")) {
    // Calendar has no dashboard of its own anymore — an already-signed-in
    // visitor lands on the unified platform home instead (cross-zone).
    return NextResponse.redirect(new URL(`${PLATFORM_URL}/app`));
  }

  return response;
}
