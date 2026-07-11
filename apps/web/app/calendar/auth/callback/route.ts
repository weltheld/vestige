import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@vestige/db/server";
import { withBasePath } from "@/lib/calendar/basePath";
import { autoEnroll, resolveDestination } from "@/lib/calendar/enroll";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/profile";

  if (!code) {
    const url = new URL(withBasePath("/login"), origin);
    url.searchParams.set("error", "missing_code");
    return NextResponse.redirect(url);
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const url = new URL(withBasePath("/login"), origin);
    url.searchParams.set("error", "exchange_failed");
    url.searchParams.set("message", error.message);
    return NextResponse.redirect(url);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await autoEnroll(user.id, user.email ?? "", next);
  }

  // resolveDestination returns a fully-prefixed path (or absolute URL) —
  // no extra basePath handling here.
  const target = await resolveDestination(supabase, next);
  return NextResponse.redirect(new URL(target, origin));
}
