/**
 * Shared Vestige platform domain types.
 *
 * These are the platform-level abstractions used across apps/web and both
 * modules — deliberately decoupled from the raw Supabase row shapes in
 * @vestige/db (which still carry legacy Council of Days naming like `note`
 * and `banner_url`). Mapping from DB rows to these types happens in the apps.
 */

/** Which modules a campaign has turned on. */
export type ModulesEnabled = {
  calendar: boolean;
  journal: boolean;
};

/** The default for campaigns predating the modules_enabled column. */
export const DEFAULT_MODULES_ENABLED: ModulesEnabled = {
  calendar: true,
  journal: false,
};

/** A member's role within a campaign. */
export type MemberRole = "dm" | "player";

/** A Supabase auth user, enriched with the platform profile fields. */
export type User = {
  id: string;
  email: string;
  /** Global display name / first name shown across the platform. */
  firstName: string | null;
  /** Global portrait URL; per-campaign portraits override this. */
  portraitUrl: string | null;
};

/** A user's membership in a campaign (the user × campaign join). */
export type Member = {
  userId: string;
  campaignId: string;
  role: MemberRole;
  /** Per-campaign character name; null falls back to the user's global name. */
  characterName: string | null;
  /** Per-campaign portrait; null falls back to the user's global portrait. */
  characterPortraitUrl: string | null;
};

/** A campaign — the shared unit both modules hang off. */
export type Campaign = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  ownerId: string;
  modulesEnabled: ModulesEnabled;
};

/** A campaign plus the viewer's relationship to it (used in lists). */
export type CampaignSummary = Campaign & {
  /** Whether the current viewer is a DM of this campaign. */
  viewerIsDm: boolean;
};
