import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { withBasePath } from "@/lib/basePath";
import { autoEnroll, resolveDestination } from "@/lib/enroll";

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

  const target = await resolveDestination(supabase, next);
  // resolveDestination can point cross-zone (the unified platform home);
  // only prepend this app's own basePath for same-zone targets.
  const url = target.startsWith("http")
    ? new URL(target)
    : new URL(withBasePath(target), origin);
  return NextResponse.redirect(url);
}
