// Canonical Supabase types for the Vestige platform (promoted Council of Days
// project). Hand-maintained for now — matches supabase/migrations/ (+ the
// migrations-calendar-legacy/ originals).
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
  /** The campaign this user most recently visited, across any module. */
  last_campaign_id: string | null;
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

// ---- Journal module (migration 20260629161452 + 20260629221431) ----------
export type JournalCharacterRoleDb = "PC" | "NPC";
export type JournalRevisionActionDb =
  | "created"
  | "edited"
  | "commented"
  | "annotated"
  | "image_added"
  | "character_added";

export type JournalSessionRow = {
  id: string;
  campaign_id: string;
  title: string;
  date: string | null;
  summary: string | null;
  player_characters: string | null;
  npcs: string | null;
  notes: string | null;
  image_url: string | null;
  /** Per-speaker talk time from the Familiar transcript. Null for sessions
   *  written by hand, or recorded before the feature existed. */
  speaking_stats: SpeakingStatsDb | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
};

/** {spanSeconds, speakers:[{name, seconds}]} — validated at the ingest before
 *  it is ever written, so readers can trust the shape. */
export type SpeakingStatsDb = {
  spanSeconds: number;
  speakers: { name: string; seconds: number }[];
};

export type JournalCharacterRow = {
  id: string;
  campaign_id: string;
  name: string;
  role: JournalCharacterRoleDb;
  portrait_url: string | null;
  bio: string | null;
  created_at: string;
};

/** Legacy. The codex no longer surfaces a life status — see NpcRoleDb. The
 *  column still exists (with its default) so existing rows and inserts are
 *  unaffected; nothing reads it. */
export type NpcStatusDb = "alive" | "dead" | "unknown";
export type NpcKindDb = "person" | "place" | "event" | "item" | "creature";
/** What kind of character an entry is. Orthogonal to `kind`: a person may be
 *  a PC or an NPC, a creature may be a familiar or a monster. */
export type NpcRoleDb = "pc" | "npc" | "companion";

/**
 * A character sheet imported from Foundry VTT.
 *
 * `data` is the parsed shape the UI renders; `raw_data` is the untouched
 * export, kept so a better parser can re-derive `data` later without anyone
 * having to re-upload.
 */
export type CharacterSheetRow = {
  id: string;
  /** Whoever pushed or uploaded it. The sheet is theirs; the campaign is
   *  where they filed it. */
  owner_id: string;
  /** Null while the sheet is still in its owner's library, unfiled. */
  campaign_id: string | null;
  foundry_actor_id: string;
  name: string;
  data: CharacterSheetData;
  raw_data: unknown | null;
  imported_by: string | null;
  /** Which campaign member plays this character. Allocated in Vestige — a
   *  Foundry export has no idea who anyone's Vestige account is. */
  player_id: string | null;
  imported_at: string;
  updated_at: string;
};

export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type AbilityScore = { value: number; modifier: number };

export type SheetItemType =
  | "weapon"
  | "equipment"
  | "consumable"
  | "tool"
  | "loot"
  | "container";

export type SheetItem = {
  id: string;
  name: string;
  /** Foundry's own image path ("icons/weapons/sword.webp"). Not a URL — it
   *  names a file inside the player's Foundry install, and is the key the
   *  artwork step resolves against. */
  imgPath?: string;
  type: SheetItemType;
  quantity: number;
  weight: number;
  rarity?: string;
  equipped: boolean;
  /** Currently attuned — independent of `equipped`: a ring can be attuned
   *  and not worn, or worn and not (yet) attuned. */
  attuned: boolean;
  /** Sanitized HTML — an allowlist of inline formatting tags only. */
  description: string;
  damage?: { formula: string; type: string };
  /** Written out — "Finesse", "Two-Handed" — never Foundry's own codes. */
  properties?: string[];
};

export type SheetFeature = {
  id: string;
  name: string;
  imgPath?: string;
  /** Where it comes from: a class, the race, a feat. */
  source: string;
  description: string;
  /** A snapshot taken at import, never live — the UI says so explicitly. */
  uses?: { value: number; max: number; recharge: string };
  actionType?: string;
};

export type SheetSpell = {
  id: string;
  name: string;
  imgPath?: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  prepared: boolean;
  /** Foundry's preparation.mode, humanised ("Prepared", "At Will", "Innate",
   *  "Always Prepared", "Pact") — never collapsed to just the boolean. */
  preparationMode: string;
  /** False for anything not prepared through the class's normal
   *  prepare-a-spell-each-day mechanism — a feat-granted spell (Magic
   *  Initiate), an innate racial spell, a domain's always-prepared spell, or
   *  a warlock's pact list. Those don't draw against the character's normal
   *  known/prepared spell count, so they shouldn't be marked as if they did. */
  countsAgainstSpellLimit: boolean;
};

/** The parsed sheet. Every derived number here is what Foundry computed;
 *  Vestige is a display layer and recalculates nothing. */
export type CharacterSheetData = {
  identity: {
    name: string;
    race: string;
    /** Foundry's icon for the race item, for the artwork step. */
    raceIconPath?: string;
    classes: {
      name: string;
      level: number;
      /** Foundry's icon for the class item. */
      iconPath?: string;
      subclass?: string;
      /** Foundry's icon for the subclass item. */
      subclassIconPath?: string;
    }[];
    background: string;
    /** Foundry's icon for the background item. */
    backgroundIconPath?: string;
    alignment: string;
    /** Only ever an absolute http(s) URL. */
    portraitUrl?: string;
    /** Foundry's path for the portrait, for the artwork step. */
    portraitPath?: string;
  };
  stats: {
    abilities: Record<AbilityKey, AbilityScore>;
    ac: number;
    hp: { value: number; max: number; temp: number };
    speed: number;
    proficiencyBonus: number;
    savingThrows: Record<string, { modifier: number; proficient: boolean }>;
    skills: Record<
      string,
      {
        modifier: number;
        proficient: boolean;
        expertise: boolean;
        /** Governing ability, shown as a tag on the skill's row. */
        ability: AbilityKey;
      }
    >;
    /**
     * Passive Perception only. Foundry carries a passive score for every
     * skill, but the rules only ever use this one (and Investigation, at a
     * DM's discretion) — so it sits with the vitals, where it gets read,
     * rather than as a column of eighteen numbers nobody consults.
     */
    passivePerception?: number;
    currency: { pp: number; gp: number; ep: number; sp: number; cp: number };
    encumbrance: { value: number; max: number };
    /** Casters only — the Overview hides the block entirely otherwise. */
    spellcasting?: { attackModifier: number; saveDc: number; ability: AbilityKey };
    /**
     * Remaining / total slots. Absent for a non-caster, and absent (rather
     * than a guessed value) for a caster whose export simply didn't carry
     * slot totals — multiclass slot math is a genuine rules calculation, not
     * arithmetic Vestige will do on its own.
     */
    spellSlots?: {
      levels: Array<{ level: number; value: number; max: number }>;
      /** Warlock's separate pool. `level` is the slot level it casts at
       *  (e.g. 3rd at character level 5), not the character's level. */
      pact?: { level: number; value: number; max: number };
    };
  };
  items: SheetItem[];
  features: SheetFeature[];
  spells: SheetSpell[];
  /**
   * Foundry image path -> the URL it was copied to. Filled by the artwork
   * step, absent until then. Keyed by path rather than by item so the stock
   * icon shared by forty items is stored once.
   */
  art?: Record<string, string>;
  /**
   * A portrait the player uploaded by hand, for when Foundry's export has
   * nothing usable (a token image behind a wall, a local file path that
   * never survived export). Deliberately its own field rather than
   * `identity.portraitUrl`: every re-import replaces `identity` wholesale
   * from the fresh export, the same way `art` would be wiped if it lived
   * there too — this has to be carried forward across a re-import the same
   * way `art` is, and take priority over both `art` and `identity.portraitUrl`
   * when the sheet renders one.
   */
  manualPortraitUrl?: string;
};

export type NpcRow = {
  id: string;
  campaign_id: string;
  name: string;
  summary: string | null;
  status: NpcStatusDb;
  role: NpcRoleDb;
  kind: NpcKindDb;
  image_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type NpcMentionRow = {
  npc_id: string;
  session_id: string;
  created_at: string;
};

export type JournalSessionCharacterRow = {
  session_id: string;
  character_id: string;
};

export type JournalAnnotationRow = {
  id: string;
  session_id: string;
  anchor: string;
  body: string;
  author_id: string;
  created_at: string;
};

/** One person's one emoji on one paragraph. Keyed by
 *  (session_id, anchor, user_id, emoji) — see the journal_reactions migration. */
export type JournalReactionRow = {
  session_id: string;
  anchor: string;
  emoji: string;
  user_id: string;
  created_at: string;
};

export type JournalSessionImageRow = {
  id: string;
  session_id: string;
  url: string;
  created_by: string;
  created_at: string;
};

export type FamiliarConnectionRow = {
  campaign_id: string;
  ingest_token: string;
  created_at: string;
  last_recap_at: string | null;
  recap_count: number;
  verified_at: string | null;
};

/** The vestige-foundry module's per-campaign push token. Same shape as
 *  FamiliarConnectionRow — one secret per campaign, validated server-side. */
export type FoundryConnectionRow = {
  /** The token belongs to a person, not a campaign — sheets land in their
   *  library and are filed into a campaign afterwards. */
  owner_id: string;
  ingest_token: string;
  created_at: string;
  last_import_at: string | null;
  import_count: number;
  verified_at: string | null;
};

export type AiProviderDb = "anthropic" | "groq";

/** A user's own AI provider key, kept once and linkable from any of their
 *  campaigns (see CampaignAiSettingsRow) instead of re-pasted per campaign. */
export type UserAiKeyRow = {
  id: string;
  user_id: string;
  provider: AiProviderDb;
  api_key: string;
  created_at: string;
  updated_at: string;
};

export type CampaignAiSettingsRow = {
  campaign_id: string;
  /** Which provider is ACTIVE for summaries (both can be linked). */
  provider: AiProviderDb;
  anthropic_key_id: string | null;
  groq_key_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CampaignJoinCodeRow = {
  campaign_id: string;
  code: string;
  created_at: string;
};

export type JournalCommentRow = {
  id: string;
  session_id: string;
  section_anchor: string | null;
  body: string;
  author_id: string;
  parent_comment_id: string | null;
  /** Attached image (additive, journal-images bucket). */
  image_url: string | null;
  created_at: string;
};

export type JournalSessionRevisionRow = {
  id: string;
  session_id: string;
  author_id: string;
  action: JournalRevisionActionDb;
  before_value: unknown | null;
  after_value: unknown | null;
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
          last_campaign_id?: string | null;
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
          last_campaign_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          Rel<"profiles_last_campaign_id_fkey", ["last_campaign_id"], "campaigns", ["id"], false>,
        ];
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
      journal_sessions: {
        Row: JournalSessionRow;
        Insert: {
          id?: string;
          campaign_id: string;
          title: string;
          date?: string | null;
          summary?: string | null;
          player_characters?: string | null;
          npcs?: string | null;
          notes?: string | null;
          image_url?: string | null;
          speaking_stats?: SpeakingStatsDb | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: Partial<JournalSessionRow>;
        Relationships: [
          Rel<"journal_sessions_campaign_id_fkey", ["campaign_id"], "campaigns", ["id"], false>,
        ];
      };
      journal_characters: {
        Row: JournalCharacterRow;
        Insert: {
          id?: string;
          campaign_id: string;
          name: string;
          role: JournalCharacterRoleDb;
          portrait_url?: string | null;
          bio?: string | null;
          created_at?: string;
        };
        Update: Partial<JournalCharacterRow>;
        Relationships: [
          Rel<"journal_characters_campaign_id_fkey", ["campaign_id"], "campaigns", ["id"], false>,
        ];
      };
      journal_session_characters: {
        Row: JournalSessionCharacterRow;
        Insert: { session_id: string; character_id: string };
        Update: Partial<JournalSessionCharacterRow>;
        Relationships: [
          Rel<"journal_session_characters_session_id_fkey", ["session_id"], "journal_sessions", ["id"], false>,
          Rel<"journal_session_characters_character_id_fkey", ["character_id"], "journal_characters", ["id"], false>,
        ];
      };
      npcs: {
        Row: NpcRow;
        Insert: {
          id?: string;
          campaign_id: string;
          name: string;
          summary?: string | null;
          status?: NpcStatusDb;
          role?: NpcRoleDb;
          kind?: NpcKindDb;
          image_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<NpcRow>;
        Relationships: [
          Rel<"npcs_campaign_id_fkey", ["campaign_id"], "campaigns", ["id"], false>,
        ];
      };
      character_sheets: {
        Row: CharacterSheetRow;
        Insert: {
          id?: string;
          owner_id: string;
          campaign_id?: string | null;
          foundry_actor_id: string;
          name: string;
          data: CharacterSheetData;
          raw_data?: unknown | null;
          imported_by?: string | null;
          player_id?: string | null;
          imported_at?: string;
          updated_at?: string;
        };
        Update: Partial<CharacterSheetRow>;
        Relationships: [
          Rel<"character_sheets_campaign_id_fkey", ["campaign_id"], "campaigns", ["id"], false>,
          Rel<"character_sheets_imported_by_fkey", ["imported_by"], "profiles", ["id"], false>,
          Rel<"character_sheets_player_id_fkey", ["player_id"], "profiles", ["id"], false>,
        ];
      };
      npc_mentions: {
        Row: NpcMentionRow;
        Insert: { npc_id: string; session_id: string; created_at?: string };
        Update: Partial<NpcMentionRow>;
        Relationships: [
          Rel<"npc_mentions_npc_id_fkey", ["npc_id"], "npcs", ["id"], false>,
          Rel<"npc_mentions_session_id_fkey", ["session_id"], "journal_sessions", ["id"], false>,
        ];
      };
      journal_annotations: {
        Row: JournalAnnotationRow;
        Insert: {
          id?: string;
          session_id: string;
          anchor: string;
          body: string;
          author_id: string;
          created_at?: string;
        };
        Update: Partial<JournalAnnotationRow>;
        Relationships: [
          Rel<"journal_annotations_session_id_fkey", ["session_id"], "journal_sessions", ["id"], false>,
        ];
      };
      journal_reactions: {
        Row: JournalReactionRow;
        Insert: {
          session_id: string;
          anchor: string;
          emoji: string;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<JournalReactionRow>;
        Relationships: [
          Rel<"journal_reactions_session_id_fkey", ["session_id"], "journal_sessions", ["id"], false>,
        ];
      };
      journal_comments: {
        Row: JournalCommentRow;
        Insert: {
          id?: string;
          session_id: string;
          section_anchor?: string | null;
          body: string;
          author_id: string;
          parent_comment_id?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
        Update: Partial<JournalCommentRow>;
        Relationships: [
          Rel<"journal_comments_session_id_fkey", ["session_id"], "journal_sessions", ["id"], false>,
          Rel<"journal_comments_parent_comment_id_fkey", ["parent_comment_id"], "journal_comments", ["id"], false>,
        ];
      };
      journal_session_images: {
        Row: JournalSessionImageRow;
        Insert: {
          id?: string;
          session_id: string;
          url: string;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<JournalSessionImageRow>;
        Relationships: [
          Rel<"journal_session_images_session_id_fkey", ["session_id"], "journal_sessions", ["id"], false>,
        ];
      };
      familiar_connections: {
        Row: FamiliarConnectionRow;
        Insert: {
          campaign_id: string;
          ingest_token: string;
          created_at?: string;
          last_recap_at?: string | null;
          recap_count?: number;
          verified_at?: string | null;
        };
        Update: Partial<FamiliarConnectionRow>;
        Relationships: [
          Rel<"familiar_connections_campaign_id_fkey", ["campaign_id"], "campaigns", ["id"], false>,
        ];
      };
      foundry_connections: {
        Row: FoundryConnectionRow;
        Insert: {
          owner_id: string;
          ingest_token: string;
          created_at?: string;
          last_import_at?: string | null;
          import_count?: number;
          verified_at?: string | null;
        };
        Update: Partial<FoundryConnectionRow>;
        Relationships: [
          Rel<"foundry_connections_owner_id_fkey", ["owner_id"], "profiles", ["id"], false>,
        ];
      };
      campaign_join_codes: {
        Row: CampaignJoinCodeRow;
        Insert: {
          campaign_id: string;
          code: string;
          created_at?: string;
        };
        Update: Partial<CampaignJoinCodeRow>;
        Relationships: [
          Rel<"campaign_join_codes_campaign_id_fkey", ["campaign_id"], "campaigns", ["id"], false>,
        ];
      };
      campaign_ai_settings: {
        Row: CampaignAiSettingsRow;
        Insert: {
          campaign_id: string;
          provider: AiProviderDb;
          anthropic_key_id?: string | null;
          groq_key_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<CampaignAiSettingsRow>;
        Relationships: [
          Rel<"campaign_ai_settings_campaign_id_fkey", ["campaign_id"], "campaigns", ["id"], false>,
          Rel<"campaign_ai_settings_anthropic_key_id_fkey", ["anthropic_key_id"], "user_ai_keys", ["id"], false>,
          Rel<"campaign_ai_settings_groq_key_id_fkey", ["groq_key_id"], "user_ai_keys", ["id"], false>,
        ];
      };
      user_ai_keys: {
        Row: UserAiKeyRow;
        Insert: {
          id?: string;
          user_id: string;
          provider: AiProviderDb;
          api_key: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<UserAiKeyRow>;
        Relationships: [
          Rel<"user_ai_keys_user_id_fkey", ["user_id"], "profiles", ["id"], false>,
        ];
      };
      journal_session_revisions: {
        Row: JournalSessionRevisionRow;
        Insert: {
          id?: string;
          session_id: string;
          author_id: string;
          action: JournalRevisionActionDb;
          before_value?: unknown | null;
          after_value?: unknown | null;
          created_at?: string;
        };
        Update: Partial<JournalSessionRevisionRow>;
        Relationships: [
          Rel<"journal_session_revisions_session_id_fkey", ["session_id"], "journal_sessions", ["id"], false>,
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
