import { notFound, redirect } from "next/navigation";
import {
  getServerSupabase,
  getServiceRoleSupabase,
} from "@/lib/supabase/server";
import { InvitePageClient } from "@/app/g/[slug]/invite/InvitePageClient";
import { Modal } from "@/components/council/Modal";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/g/${slug}/invite`);

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, slug, name, creator_id, background")
    .eq("slug", slug)
    .maybeSingle();
  if (!campaign) notFound();
  if (campaign.creator_id !== user.id) {
    // Only the creator can manage invites — boot non-creators back into
    // the campaign view rather than expose a forbidden screen.
    redirect(`/g/${slug}`);
  }

  const [{ data: invitations }, { data: members }] = await Promise.all([
    supabase
      .from("invitations")
      .select("id, email, user_id, status")
      .eq("campaign_id", campaign.id),
    supabase
      .from("campaign_members")
      .select("user_id, role, is_dm")
      .eq("campaign_id", campaign.id),
  ]);

  // Look up profile rows for everyone referenced above in one shot.
  const userIds = new Set<string>();
  for (const m of members ?? []) userIds.add(m.user_id);
  for (const i of invitations ?? []) if (i.user_id) userIds.add(i.user_id);
  const { data: profiles } = userIds.size
    ? await supabase
        .from("profiles")
        .select("id, display_name, email, avatar_url")
        .in("id", Array.from(userIds))
    : { data: [] };
  const profileById = new Map(
    (profiles ?? []).map((p) => [p.id, p] as const),
  );

  // Signed-up people I invited (to any of my campaigns) who aren't allocated
  // to any campaign yet — addable directly to this calendar.
  const admin = getServiceRoleSupabase();
  const { data: myCampaigns } = await supabase
    .from("campaigns")
    .select("id")
    .eq("creator_id", user.id);
  const myIds = (myCampaigns ?? []).map((c) => c.id);

  type Addable = {
    userId: string;
    displayName: string;
    email: string;
    avatarUrl?: string;
  };
  let addableUsers: Addable[] = [];
  if (myIds.length > 0) {
    const { data: myInvites } = await supabase
      .from("invitations")
      .select("user_id, email")
      .in("campaign_id", myIds);
    const invitedIds = new Set<string>();
    const invitedEmails = new Set<string>();
    for (const i of myInvites ?? []) {
      if (i.user_id) invitedIds.add(i.user_id);
      if (i.email) invitedEmails.add(i.email.toLowerCase());
    }

    const [{ data: byId }, { data: byEmail }] = await Promise.all([
      invitedIds.size
        ? admin
            .from("profiles")
            .select("id, display_name, email, avatar_url")
            .in("id", Array.from(invitedIds))
        : Promise.resolve({ data: [] }),
      invitedEmails.size
        ? admin
            .from("profiles")
            .select("id, display_name, email, avatar_url")
            .in("email", Array.from(invitedEmails))
        : Promise.resolve({ data: [] }),
    ]);

    const candMap = new Map<
      string,
      { id: string; display_name: string; email: string; avatar_url: string | null }
    >();
    for (const p of [...(byId ?? []), ...(byEmail ?? [])]) candMap.set(p.id, p);
    const candIds = Array.from(candMap.keys());

    if (candIds.length) {
      const { data: memberRows } = await admin
        .from("campaign_members")
        .select("user_id")
        .in("user_id", candIds);
      const allocated = new Set((memberRows ?? []).map((m) => m.user_id));
      addableUsers = candIds
        .filter((id) => !allocated.has(id))
        .map((id) => {
          const p = candMap.get(id)!;
          return {
            userId: id,
            displayName: p.display_name ?? "",
            email: p.email ?? "",
            avatarUrl: p.avatar_url ?? undefined,
          };
        });
    }
  }

  return (
    <Modal>
      <InvitePageClient
        slug={campaign.slug}
        name={campaign.name}
        background={campaign.background}
        addableUsers={addableUsers}
        members={(members ?? []).map((m) => {
          const p = profileById.get(m.user_id);
          return {
            userId: m.user_id,
            role: m.role,
            isDm: m.is_dm,
            displayName: p?.display_name ?? "",
            email: p?.email ?? "",
            avatarUrl: p?.avatar_url ?? undefined,
          };
        })}
        invitations={(invitations ?? []).map((i) => {
          const p = i.user_id ? profileById.get(i.user_id) : undefined;
          return {
            id: i.id,
            email: i.email ?? p?.email ?? "",
            displayName: p?.display_name ?? null,
            avatarUrl: p?.avatar_url ?? undefined,
            status: i.status,
          };
        })}
      />
    </Modal>
  );
}
