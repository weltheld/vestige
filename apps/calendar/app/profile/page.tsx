import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <ProfileForm
      email={user.email ?? ""}
      initial={{
        character_name: profile?.character_name ?? "",
        display_name: profile?.display_name ?? "",
        avatar_url: profile?.avatar_url ?? null,
      }}
    />
  );
}
