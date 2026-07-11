export type VoteValue = "yes" | "maybe" | "no";

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type BackgroundScene = "tavern" | "parchment" | "wine" | "forest";
export type CampaignPhase = "draft" | "live";

export type User = {
  id: string;
  email: string;
  displayName: string;
  characterName: string;
  avatarUrl?: string;
};

// A "Campaign-Poll" — kept the type name Group for internal cohesion but the
// terminology in UI copy is "campaign" / "campaign-poll". Same entity.
export type Group = {
  id: string;
  slug: string;
  name: string;
  note?: string;
  // The creator owns settings + invites. Also acts as the in-character Dungeon Master.
  creatorId: string;
  // Alias kept for components that read the old name; equal to creatorId.
  dmId: string;
  phase: CampaignPhase;
  viableWeekdays: Weekday[];
  background: BackgroundScene;
  bannerUrl?: string;
  createdAt: string;
};

export type Member = {
  groupId: string;
  userId: string;
  role: "creator" | "participant";
  /** Table role: a Dungeon Master vs a player. Multiple DMs are allowed. */
  isDm: boolean;
  joinedAt: string;
};

// Pre-launch invitations live in this list. They can target either an existing
// platform user (userId) or a fresh email address (email). Once accepted they
// become a real Member.
export type Invitation = {
  groupId: string;
  userId?: string;
  email?: string;
  status: "queued" | "sent" | "joined";
  invitedAt: string;
};

export type Vote = {
  groupId: string;
  userId: string;
  date: string;
  value: VoteValue;
};

export type Session = { userId: string | null };
