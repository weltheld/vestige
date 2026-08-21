import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@vestige/db";
import { publicSupabaseAnonKey, publicSupabaseUrl } from "@vestige/db";

// Calendar's paths joined this list when it was folded into this app —
// unauthenticated visitors there go to Calendar's own login (magic-link +
// auto-enroll flow), everything else to the platform sign-in.
const PROTECTED_PATHS = [
  "/app",
  "/calendar/profile",
  "/calendar/new",
  "/calendar/g/",
  "/calendar/home",
];

// The one case that actually wants Calendar's own bare login form: a genuine
// invite link, which auto-enrols on sign-in so there's no extra click. Every
// other /calendar/* path (a bare campaign visit, /profile, /new, /home) was
// falling into this same bucket by accident — a logged-out visitor following
// a plain campaign link landed on a chrome-less card with no header, no
// footer, no way back to the rest of the site, which read as the site
// simply not having loaded rather than as a sign-in prompt.
const INVITE_LINK = /^\/calendar\/g\/[^/]+\/invite(\/|$)/;

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
    // Calendar invite links keep their own login (auto-enrols, no extra
    // click). Everything else — a bare /app visit, a bookmarked campaign
    // link, /profile, /new, /home — goes to the landing page first rather
    // than straight to a bare sign-in form; its own Log in / Join Vestige
    // Campaign links carry `next` the rest of the way.
    redirectUrl.pathname = INVITE_LINK.test(pathname) ? "/calendar/login" : "/";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // A signed-in visit to /calendar/login WITH a ?next param is an invite
  // link — let the login page run: it auto-enrols and forwards without a
  // re-auth round trip. Without ?next (or on the other entry pages) there's
  // nothing to do there; the platform home covers it.
  const plainLogin =
    pathname === "/calendar/login" && !request.nextUrl.searchParams.has("next");
  if (
    user &&
    (pathname === "/" ||
      pathname === "/signin" ||
      pathname === "/signup" ||
      pathname === "/calendar" ||
      plainLogin)
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/app";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
