import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@vestige/db";
import { getServiceRoleSupabase } from "@vestige/db/server";

type SB = SupabaseClient<Database>;

type ManageMember = {
  userId: string;
  isDm: boolean;
  name: string;
  avatarUrl: string | null;
};
type ManageInvitation = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  status: string;
  emailInvite: boolean;
};
type ManageAddable = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

export type ManageData = {
  campaignId: string;
  slug: string;
  name: string;
  /** The signed-in viewer. Creators see the full invite/manage surface and
   *  can remove others; members see a read-only party list + Leave. */
  viewerId: string;
  isCreator: boolean;
  creatorId: string;
  members: ManageMember[];
  invitations: ManageInvitation[];
  addableUsers: ManageAddable[];
  joinCode: string;
};

// No 0/O/1/I/L — the characters people most often mix up when reading a
// code off a screen or a scrap of paper.
const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function newJoinCode(): string {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => JOIN_CODE_ALPHABET[b % JOIN_CODE_ALPHABET.length]).join("");
}

/** The campaign's join code, created on first access (idempotent — one
 *  code per campaign, creator-only per RLS). Uses the service role since
 *  `getManageData` already establishes the caller is the creator. */
async function getOrCreateJoinCode(campaignId: string): Promise<string> {
  const admin = getServiceRoleSupabase();
  const { data: existing } = await admin
    .from("campaign_join_codes")
    .select("code")
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (existing) return existing.code;

  const { data: created, error } = await admin
    .from("campaign_join_codes")
    .insert({ campaign_id: campaignId, code: newJoinCode() })
    .select("code")
    .single();
  if (error || !created) throw error ?? new Error("Failed to create join code.");
  return created.code;
}

/** Everything the manage screen needs. Creators get the full invite surface;
 *  members get a read-only party list (+ Leave, handled in the UI). Returns
 *  null if the campaign doesn't exist or the viewer isn't in it at all. */
export async function getManageData(
  supabase: SB,
  campaignId: string,
  userId: string,
): Promise<ManageData | null> {
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, slug, name, creator_id")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return null;
  const isCreator = campaign.creator_id === userId;

  const admin = getServiceRoleSupabase();

  // Members are needed for both views. Read with the service role after we
  // confirm (below) the viewer belongs to the campaign — profiles RLS won't
  // reliably expose fellow members otherwise.
  const { data: members } = await admin
    .from("campaign_members")
    .select("user_id, is_dm")
    .eq("campaign_id", campaignId);

  // Non-creators must be members of this campaign to see anything.
  if (!isCreator && !(members ?? []).some((m) => m.user_id === userId)) return null;

  // Invitations are a creator-only concern.
  const { data: invitations } = isCreator
    ? await supabase
        .from("invitations")
        .select("id, email, user_id, status")
        .eq("campaign_id", campaignId)
    : { data: [] as { id: string; email: string | null; user_id: string | null; status: string }[] };

  const ids = new Set<string>();
  for (const m of members ?? []) ids.add(m.user_id);
  for (const i of invitations ?? []) if (i.user_id) ids.add(i.user_id);
  const { data: profiles } = ids.size
    ? await admin
        .from("profiles")
        .select("id, first_name, display_name, email, avatar_url")
        .in("id", [...ids])
    : { data: [] };
  const profById = new Map((profiles ?? []).map((p) => [p.id, p] as const));
  const nameOf = (p: { first_name: string | null; display_name: string | null } | undefined) =>
    p?.first_name?.trim() || p?.display_name?.trim() || "Adventurer";

  const memberList: ManageMember[] = (members ?? [])
    .map((m) => {
      const p = profById.get(m.user_id);
      return { userId: m.user_id, isDm: m.is_dm, name: nameOf(p), avatarUrl: p?.avatar_url ?? null };
    })
    .sort((a, b) => (a.isDm === b.isDm ? 0 : a.isDm ? -1 : 1));

  const invitationList: ManageInvitation[] = (invitations ?? [])
    .filter((i) => i.status !== "joined")
    .map((i) => {
      const p = i.user_id ? profById.get(i.user_id) : undefined;
      return {
        id: i.id,
        name: p ? nameOf(p) : null,
        email: i.email ?? p?.email ?? "",
        avatarUrl: p?.avatar_url ?? null,
        status: i.status,
        emailInvite: !i.user_id,
      };
    });

  // People this creator invited (to any of their campaigns) who aren't in
  // any campaign yet — addable directly (creator-only). Uses the service role
  // because they aren't members of this campaign, so RLS wouldn't let the
  // creator read their profiles otherwise.
  let addableUsers: ManageAddable[] = [];
  if (isCreator) {
    const { data: myCampaigns } = await admin
      .from("campaigns")
      .select("id")
      .eq("creator_id", userId);
    const myIds = (myCampaigns ?? []).map((c) => c.id);
    if (myIds.length) {
    const { data: myInvites } = await admin
      .from("invitations")
      .select("user_id, email")
      .in("campaign_id", myIds);
    const invIds = new Set<string>();
    const invEmails = new Set<string>();
    for (const i of myInvites ?? []) {
      if (i.user_id) invIds.add(i.user_id);
      if (i.email) invEmails.add(i.email.toLowerCase());
    }
    const [{ data: byId }, { data: byEmail }] = await Promise.all([
      invIds.size
        ? admin.from("profiles").select("id, first_name, display_name, email, avatar_url").in("id", [...invIds])
        : Promise.resolve({ data: [] as NonNullable<Awaited<ReturnType<typeof admin.from>>["data"]> }),
      invEmails.size
        ? admin.from("profiles").select("id, first_name, display_name, email, avatar_url").in("email", [...invEmails])
        : Promise.resolve({ data: [] as NonNullable<Awaited<ReturnType<typeof admin.from>>["data"]> }),
    ]);
    type Cand = { id: string; first_name: string | null; display_name: string | null; email: string | null; avatar_url: string | null };
    const cand = new Map<string, Cand>();
    for (const p of [...((byId as Cand[]) ?? []), ...((byEmail as Cand[]) ?? [])]) cand.set(p.id, p);
    const candIds = [...cand.keys()];
    if (candIds.length) {
      const { data: allocated } = await admin
        .from("campaign_members")
        .select("user_id")
        .in("user_id", candIds);
      const taken = new Set((allocated ?? []).map((m) => m.user_id));
      addableUsers = candIds
        .filter((id) => !taken.has(id))
        .map((id) => {
          const p = cand.get(id)!;
          return { userId: id, name: nameOf(p), email: p.email ?? "", avatarUrl: p.avatar_url ?? null };
        });
      }
    }
  }

  // The join code is a creator-only invite affordance; members never see it.
  const joinCode = isCreator ? await getOrCreateJoinCode(campaignId) : "";

  return {
    campaignId,
    slug: campaign.slug,
    name: campaign.name,
    viewerId: userId,
    isCreator,
    creatorId: campaign.creator_id,
    members: memberList,
    invitations: invitationList,
    addableUsers,
    joinCode,
  };
}
