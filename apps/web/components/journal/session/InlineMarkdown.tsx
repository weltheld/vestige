import Link from "next/link";
import { journal } from "@/lib/journal/links";
import {
  autoLinkTokens,
  tokenizeInline,
  type InlineToken,
} from "@/lib/journal/inline-tokens";
import type { AutoLinker } from "@/lib/journal/auto-link";

/** Renders the tokens from tokenizeInline(). Parsing lives in that module so
 *  it can be tested without a JSX runtime; this file is only presentation. */

// The old hover (colour only, on a 1px rule) compiled and fired correctly
// but was too small a change on too thin a line to register as "something
// happened." decoration-2 on hover adds a second, unmissable axis — the
// rule visibly thickens at the same moment it darkens — while staying the
// same quiet colour-only language rather than the bolder glow/background
// effects that were drafted and turned down.
const LINK_CLASS =
  "text-wine underline decoration-[color-mix(in_srgb,var(--wine)_40%,transparent)] underline-offset-2 transition hover:decoration-2 hover:decoration-wine";

/**
 * Render one run of inline markdown. `campaignId` enables codex/session
 * links; omit it on surfaces already wrapped in a link, where mentions
 * render as plain labels instead.
 */
export type AutoLink = {
  linker: AutoLinker;
  /** Shared across one chapter so a name links on first mention only. */
  seen: Set<string>;
};

export function renderInline(
  text: string,
  campaignId?: string,
  auto?: AutoLink,
): React.ReactNode {
  let tokens = tokenizeInline(text);
  // Without a campaignId there's nowhere for a codex link to point, so
  // auto-linking is skipped rather than rendered as a bare label.
  if (auto && campaignId) tokens = autoLinkTokens(tokens, auto.linker, auto.seen);
  return toNodes(tokens, campaignId);
}

function toNodes(tokens: InlineToken[], campaignId?: string): React.ReactNode {
  return tokens.map((t, i) => {
    switch (t.type) {
      case "text":
        return t.value;
      case "bold":
        return (
          <strong key={i} className="font-semibold text-ink">
            {toNodes(t.children, campaignId)}
          </strong>
        );
      case "italic":
        return <em key={i}>{toNodes(t.children, campaignId)}</em>;
      case "code":
        return (
          <code
            key={i}
            className="rounded bg-cod-soft px-1 py-0.5 font-mono text-[0.9em] text-ink"
          >
            {t.value}
          </code>
        );
      case "ref": {
        // Emphasis inside the label renders as emphasis — including when
        // there's no campaignId and the mention degrades to a plain label.
        const inner = t.children ? toNodes(t.children, campaignId) : t.label;
        if (!campaignId) return <span key={i}>{inner}</span>;
        return (
          <Link
            key={i}
            href={
              t.kind === "session"
                ? journal.session(campaignId, t.id)
                : journal.npc(campaignId, t.id)
            }
            className={LINK_CLASS}
          >
            {inner}
          </Link>
        );
      }
      case "link":
        return (
          // External destination — opens away, with the usual noopener guard.
          <a key={i} href={t.href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            {t.children ? toNodes(t.children, campaignId) : t.label}
          </a>
        );
    }
  });
}
