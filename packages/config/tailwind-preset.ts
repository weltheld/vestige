import type { Config } from "tailwindcss";

/**
 * Shared Vestige Tailwind preset — the Council of Days design language.
 * Apps add their own `content` globs and spread this preset:
 *
 *   import vestigePreset from "@vestige/config/tailwind-preset";
 *   export default { presets: [vestigePreset], content: [...] };
 *
 * The CSS variables themselves live in each app's globals.css (see the
 * @vestige/ui tokens.css the apps import), so the palette stays in one place.
 */
const preset: Omit<Config, "content"> = {
  theme: {
    extend: {
      colors: {
        parchment: "var(--parchment)",
        surface: "var(--surface)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        muted: "var(--muted)",
        hairline: "var(--hairline)",
        wine: "var(--wine)",
        gold: "var(--gold)",
        "gold-soft": "var(--gold-soft)",
        "cod-soft": "var(--cod-soft)",
        "vote-yes": "var(--vote-yes)",
        "vote-maybe": "var(--vote-maybe)",
        "vote-no": "var(--vote-no)",
        "dm-gold": "var(--dm-gold)",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      boxShadow: {
        parchment:
          "0 8px 32px -8px rgba(43, 33, 24, 0.18), 0 2px 4px rgba(43, 33, 24, 0.06)",
        crest: "0 4px 12px rgba(43, 33, 24, 0.25)",
        wine: "0 5px 14px rgba(107, 34, 48, 0.25)",
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};

export default preset;
