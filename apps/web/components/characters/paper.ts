import type { CSSProperties } from "react";

/**
 * Feint ruling, as on the stock a character sheet is printed on.
 *
 * A gradient rather than an image: it costs nothing, scales to any width, and
 * is drawn from the theme's own hairline colour, so it survives a switch to
 * midnight or ember instead of turning into grey lines on a dark page.
 *
 * Held at 40% of hairline deliberately. The rules should be something you
 * notice about the paper, not something you read past the text.
 */
export const RULED_PAPER: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(180deg, transparent 0 25px, color-mix(in srgb, var(--hairline) 40%, transparent) 25px 26px)",
};
