import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@vestige/db";
import { type CampaignSummary } from "@vestige/domain";

/** Campaigns the given user is a member of, newest-joined first. */
export async function getMyCampaigns(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CampaignSummary[]> {
  const { data, error } = await supabase
    .from("campaign_members")
    .select("is_dm, campaigns(id, slug, name, note, banner_url, creator_id, modules_enabled)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .filter((row) => row.campaigns !== null)
    .map((row) => {
      const c = row.campaigns!;
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.note,
        imageUrl: c.banner_url,
        ownerId: c.creator_id,
        modulesEnabled: c.modules_enabled,
        viewerIsDm: row.is_dm,
      } satisfies CampaignSummary;
    });
}
