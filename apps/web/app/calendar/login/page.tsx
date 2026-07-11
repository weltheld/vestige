import { redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import { autoEnroll, resolveDestination } from "@/lib/calendar/enroll";
import { LoginForm } from "@/components/council/LoginForm";

/**
 * Server Component so an already-signed-in visitor can be short-circuited
 * straight through, with no re-auth round trip: this is what makes a
 * Manage-Campaign invite link "just work" for an existing platform member —
 * clicking it enrols + redirects immediately, instead of asking them to type
 * their email again and click yet another magic-link email. A genuinely
 * signed-out visitor still gets the familiar magic-link form below.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; message?: string }>;
}) {
  const { next = "/profile", error, message } = await searchParams;

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await autoEnroll(user.id, user.email ?? "", next);
    // resolveDestination returns a fully-prefixed path — use as-is.
    const target = await resolveDestination(supabase, next);
    redirect(target);
  }

  return <LoginForm next={next} initialError={error} initialErrorMessage={message} />;
}
