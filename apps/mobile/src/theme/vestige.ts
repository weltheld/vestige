/** Vestige design tokens, ported from packages/ui/src/styles/tokens.css.
 *  Keep the hex values in lockstep with that file — it is the source of
 *  truth (both derive from the Pencil design). */

export type VestigeTheme = {
  scheme: "light" | "dark";
  parchment: string;
  surface: string;
  ink: string;
  inkSoft: string;
  muted: string;
  hairline: string;
  wine: string;
  gold: string;
  goldSoft: string;
  codSoft: string;
  voteYes: string;
  voteMaybe: string;
  voteNo: string;
  dmGold: string;
};

export type ThemeName = "parchment" | "midnight" | "nebula" | "ember" | "slate";

export const themes: Record<ThemeName, VestigeTheme> = {
  parchment: {
    scheme: "light",
    parchment: "#f4ecd8",
    surface: "#faf6ee",
    ink: "#2b2118",
    inkSoft: "#5a4a38",
    muted: "#9e8e78",
    hairline: "#d8c8ac",
    wine: "#6e1423",
    gold: "#b08d57",
    goldSoft: "#d9b45a",
    codSoft: "#f9f1dc",
    voteYes: "#3e5c44",
    voteMaybe: "#b08d57",
    voteNo: "#9a4a3a",
    dmGold: "#7a5a12",
  },
  midnight: {
    scheme: "dark",
    parchment: "#13110C",
    surface: "#1F1A13",
    ink: "#EEE5D5",
    inkSoft: "#B6A891",
    muted: "#8A7C68",
    hairline: "#3A3125",
    wine: "#D06176",
    gold: "#D9B45A",
    goldSoft: "#E6C877",
    codSoft: "#241E16",
    voteYes: "#6FBF88",
    voteMaybe: "#E0B94A",
    voteNo: "#E07C66",
    dmGold: "#D9B45A",
  },
  nebula: {
    scheme: "dark",
    parchment: "#0B0F1E",
    surface: "#151B33",
    ink: "#E7ECFF",
    inkSoft: "#99A6CE",
    muted: "#6E7BA6",
    hairline: "#2A3356",
    wine: "#FF5C8A",
    gold: "#56D6EA",
    goldSoft: "#8BE6F2",
    codSoft: "#1A2140",
    voteYes: "#4FE0A0",
    voteMaybe: "#E6C34F",
    voteNo: "#FF6B6B",
    dmGold: "#56D6EA",
  },
  ember: {
    scheme: "dark",
    parchment: "#17110E",
    surface: "#241A15",
    ink: "#F3E4D1",
    inkSoft: "#C2AB90",
    muted: "#8F7A63",
    hairline: "#402F25",
    wine: "#E2603A",
    gold: "#E8A94B",
    goldSoft: "#F1C877",
    codSoft: "#2A1E17",
    voteYes: "#8FB56A",
    voteMaybe: "#E8A94B",
    voteNo: "#D8503A",
    dmGold: "#E8A94B",
  },
  slate: {
    scheme: "dark",
    parchment: "#13161A",
    surface: "#1D2127",
    ink: "#E8EDF1",
    inkSoft: "#A3AFB9",
    muted: "#79858F",
    hairline: "#333B43",
    wine: "#C86B79",
    gold: "#C9B36E",
    goldSoft: "#DBC98C",
    codSoft: "#232830",
    voteYes: "#6FBF88",
    voteMaybe: "#D8BE63",
    voteNo: "#D9705F",
    dmGold: "#C9B36E",
  },
};

export const fonts = {
  display: "Cinzel_700Bold",
  displayRegular: "Cinzel_400Regular",
  body: "Lora_400Regular",
  bodyItalic: "Lora_400Regular_Italic",
  bodyBold: "Lora_700Bold",
} as const;
