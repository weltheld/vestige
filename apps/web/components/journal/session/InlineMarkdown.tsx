import Link from "next/link";
import { journal } from "@/lib/journal/links";
import { tokenizeInline, type InlineToken } from "@/lib/journal/inline-tokens";

/** Renders the tokens from tokenizeInline(). Parsing lives in that module so
 *  it can be tested without a JSX runtime; this file is only presentation. */

const LINK_CLASS =
  "text-wine underline decoration-[color-mix(in_srgb,var(--wine)_40%,transparent)] underline-offset-2 transition hover:decoration-wine";

/**
 * Render one run of inline markdown. `campaignId` enables codex/session
 * links; omit it on surfaces already wrapped in a link, where mentions
 * render as plain labels instead.
 */
export function renderInline(text: string, campaignId?: string): React.ReactNode {
  return toNodes(tokenizeInline(text), campaignId);
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
      case "ref":
        if (!campaignId) return t.label;
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
            {t.label}
          </Link>
        );
      case "link":
        return (
          // External destination — opens away, with the usual noopener guard.
          <a key={i} href={t.href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            {t.label}
          </a>
        );
    }
  });
}
