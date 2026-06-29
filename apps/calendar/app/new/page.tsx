import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { CampaignWizardClient } from "./CampaignWizardClient";

export default async function NewCampaignPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/new");

  // Load existing platform users (other than me) for the invite picker.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, display_name, character_name, avatar_url")
    .neq("id", user.id)
    .order("display_name", { ascending: true });

  return (
    <CampaignWizardClient
      currentUserEmail={user.email ?? ""}
      otherUsers={(profiles ?? []).map((p) => ({
        id: p.id,
        email: p.email,
        displayName: p.display_name,
        characterName: p.character_name,
        avatarUrl: p.avatar_url ?? undefined,
      }))}
    />
  );
}
