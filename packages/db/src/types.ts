// Canonical Supabase types for the Vestige platform (promoted Council of Days
// project). Hand-maintained for now — matches apps/calendar/supabase/migrations.
//
// To regenerate from the live schema once the M7 Journal migration lands:
//   pnpm dlx supabase gen types typescript --linked > packages/db/src/types.ts
// (requires `supabase login` + `supabase link --project-ref <ref>`).
//
// Difference from the legacy CoD copy: FK Relationships are populated, so
// PostgREST embedded selects (e.g. campaign_members → campaigns) type cleanly.

/** Shape of the additive campaigns.modules_enabled jsonb column (M7). */
export type CampaignModulesDb = {
  calendar: boolean;
  journal: boolean;
};

export type CampaignPhaseDb = "draft" | "live";
export type MemberRoleDb = "creator" | "participant";
export type VoteValueDb = "yes" | "maybe" | "no";
export type InvitationStatusDb = "queued" | "sent" | "joined";
export type BackgroundSceneDb = "tavern" | "parchment" | "wine" | "forest";

export type ProfileRow = {
  id: string;
  email: string;
  character_name: string;
  display_name: string;
  /** Global first name (additive, M7). NULL on rows predating the column. */
  first_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CampaignRow = {
  id: string;
  slug: string;
  name: string;
  note: string | null;
  creator_id: string;
  phase: CampaignPhaseDb;
  viable_weekdays: number[];
  background: BackgroundSceneDb;
  banner_url: string | null;
  /** Which modules this campaign has on (additive, M7). */
  modules_enabled: CampaignModulesDb;
  created_at: string;
};

export type CampaignMemberRow = {
  campaign_id: string;
  user_id: string;
  role: MemberRoleDb;
  is_dm: boolean;
  joined_at: string;
  /** Per-campaign character name; null => fall back to the profile. */
  character_name: string | null;
  /** Per-campaign portrait URL; null => fall back to the profile. */
  avatar_url: string | null;
};

export type UserImageRow = {
  id: string;
  user_id: string;
  url: string;
  created_at: string;
};

export type InvitationRow = {
  id: string;
  campaign_id: string;
  user_id: string | null;
  email: string | null;
  status: InvitationStatusDb;
  invited_at: string;
};

export type VoteRow = {
  campaign_id: string;
  user_id: string;
  date: string;
  value: VoteValueDb;
  updated_at: string;
};

export type CampaignSessionRow = {
  campaign_id: string;
  date: string;
  note: string;
  created_at: string;
};

type Rel<
  Name extends string,
  Cols extends string[],
  Rel_ extends string,
  RefCols extends string[],
  OneToOne extends boolean,
> = {
  foreignKeyName: Name;
  columns: Cols;
  isOneToOne: OneToOne;
  referencedRelation: Rel_;
  referencedColumns: RefCols;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: {
          id: string;
          email: string;
          character_name?: string;
          display_name?: string;
          first_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          character_name?: string;
          display_name?: string;
          first_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaigns: {
        Row: CampaignRow;
        Insert: {
          id?: string;
          slug?: string;
          name: string;
          note?: string | null;
          creator_id: string;
          phase?: CampaignPhaseDb;
          viable_weekdays?: number[];
          background?: BackgroundSceneDb;
          banner_url?: string | null;
          modules_enabled?: CampaignModulesDb;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          note?: string | null;
          creator_id?: string;
          phase?: CampaignPhaseDb;
          viable_weekdays?: number[];
          background?: BackgroundSceneDb;
          banner_url?: string | null;
          modules_enabled?: CampaignModulesDb;
          created_at?: string;
        };
        Relationships: [
          Rel<"campaigns_creator_id_fkey", ["creator_id"], "profiles", ["id"], false>,
        ];
      };
      campaign_members: {
        Row: CampaignMemberRow;
        Insert: {
          campaign_id: string;
          user_id: string;
          role?: MemberRoleDb;
          is_dm?: boolean;
          joined_at?: string;
          character_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          campaign_id?: string;
          user_id?: string;
          role?: MemberRoleDb;
          is_dm?: boolean;
          joined_at?: string;
          character_name?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [
          Rel<"campaign_members_campaign_id_fkey", ["campaign_id"], "campaigns", ["id"], false>,
          Rel<"campaign_members_user_id_fkey", ["user_id"], "profiles", ["id"], false>,
        ];
      };
      user_images: {
        Row: UserImageRow;
        Insert: {
          id?: string;
          user_id: string;
          url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          url?: string;
          created_at?: string;
        };
        Relationships: [
          Rel<"user_images_user_id_fkey", ["user_id"], "profiles", ["id"], false>,
        ];
      };
      invitations: {
        Row: InvitationRow;
        Insert: {
          id?: string;
          campaign_id: string;
          user_id?: string | null;
          email?: string | null;
          status?: InvitationStatusDb;
          invited_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          user_id?: string | null;
          email?: string | null;
          status?: InvitationStatusDb;
          invited_at?: string;
        };
        Relationships: [
          Rel<"invitations_campaign_id_fkey", ["campaign_id"], "campaigns", ["id"], false>,
          Rel<"invitations_user_id_fkey", ["user_id"], "profiles", ["id"], false>,
        ];
      };
      votes: {
        Row: VoteRow;
        Insert: {
          campaign_id: string;
          user_id: string;
          date: string;
          value: VoteValueDb;
          updated_at?: string;
        };
        Update: {
          campaign_id?: string;
          user_id?: string;
          date?: string;
          value?: VoteValueDb;
          updated_at?: string;
        };
        Relationships: [
          Rel<"votes_campaign_id_fkey", ["campaign_id"], "campaigns", ["id"], false>,
          Rel<"votes_user_id_fkey", ["user_id"], "profiles", ["id"], false>,
        ];
      };
      campaign_sessions: {
        Row: CampaignSessionRow;
        Insert: {
          campaign_id: string;
          date: string;
          note?: string;
          created_at?: string;
        };
        Update: {
          campaign_id?: string;
          date?: string;
          note?: string;
          created_at?: string;
        };
        Relationships: [
          Rel<"campaign_sessions_campaign_id_fkey", ["campaign_id"], "campaigns", ["id"], false>,
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      accept_invitation: {
        Args: { p_invitation: string };
        Returns: CampaignMemberRow;
      };
      is_campaign_member: {
        Args: { p_campaign: string };
        Returns: boolean;
      };
      is_campaign_creator: {
        Args: { p_campaign: string };
        Returns: boolean;
      };
      slugify: {
        Args: { input: string };
        Returns: string;
      };
    };
    Enums: {
      campaign_phase: CampaignPhaseDb;
      member_role: MemberRoleDb;
      vote_value: VoteValueDb;
      invitation_status: InvitationStatusDb;
      background_scene: BackgroundSceneDb;
    };
    CompositeTypes: Record<string, never>;
  };
};
