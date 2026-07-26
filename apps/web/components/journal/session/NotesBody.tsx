import Link from "next/link";
import type { SessionDetail, Annotation, Reaction } from "@/lib/journal/session-detail";
import { NOTE_SECTIONS, blocksFor, chaptersFor, excerpt, type NoteChapter } from "@/lib/journal/notes";
import { journal } from "@/lib/journal/links";
import { AnnotationThread } from "./AnnotationControls";
import { ReactionBar } from "./ParagraphReactions";

export type NotesPlayer = {
  userId: string;
  characterName: string;
  avatarUrl: string | null;
  isDm: boolean;
};

export function NotesBody({
  session,
  campaignId,
  players = [],
}: {
  session: SessionDetail;
  campaignId: string;
  /** Campaign players — lets the Player Characters section render avatar
   *  chips instead of the raw markdown bullet list. */
  players?: NotesPlayer[];
}) {
  const text: Record<string, string | null> = {
    summary: session.summary,
    player_characters: session.playerCharacters,
    npcs: session.npcs,
    notes: session.notes,
  };

  return (
    <div className="relative flex flex-col gap-9 pt-7">
      {NOTE_SECTIONS.map(({ key, label }) => {
        const blocks = blocksFor(key, text[key] ?? null);
        const sectionCommentCount = blocks.reduce(
          (n, b) => n + (session.annotationsByAnchor[b.anchor]?.length ?? 0),
          0,
        );
        return (
          <section key={key} className="flex flex-col">
            <div className="flex items-center gap-2.5 pb-3">
              <span className="h-3.5 w-0.5 bg-gold" />
              <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                {label}
              </h2>
              {sectionCommentCount > 0 && (
                <span className="ml-auto font-body text-[10px] text-muted">
                  {sectionCommentCount} {sectionCommentCount === 1 ? "comment" : "comments"}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-7">
              {blocks.length === 0 ? (
                <p className="font-body text-[17px] italic leading-[1.75] text-muted">
                  Nothing recorded here yet.
                </p>
              ) : key === "player_characters" ? (
                // The stored markdown is a "- Name" list written by the
                // editor's chip toggler — render it back as avatar chips.
                <PlayerChips
                  text={text[key] ?? ""}
                  players={players}
                  anchor={blocks[0]!.anchor}
                  annotations={session.annotationsByAnchor[blocks[0]!.anchor] ?? []}
                  campaignId={campaignId}
                  sessionId={session.id}
                />
              ) : (
                chaptersFor(blocks).map((chapter) => (
                  <Chapter
                    key={chapter.anchor}
                    chapter={chapter}
                    session={session}
                    campaignId={campaignId}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PlayerChips({
  text,
  players,
  anchor,
  annotations,
  campaignId,
  sessionId,
}: {
  text: string;
  players: NotesPlayer[];
  anchor: string;
  annotations: Annotation[];
  campaignId: string;
  sessionId: string;
}) {
  // "- Name" lines from the editor's chip toggler; anything else (freehand
  // legacy text) falls back to a plain name chip without an avatar.
  const names = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);
  const byName = new Map(players.map((p) => [p.characterName.toLowerCase(), p] as const));
  const has = annotations.length > 0;

  return (
    <div className="group relative">
      <div className={has ? "rounded-[10px] border-l-2 border-gold bg-cod-soft px-4 py-3" : ""}>
        <div className="flex flex-wrap gap-2">
          {names.map((n) => {
            const p = byName.get(n.toLowerCase());
            return (
              <span
                key={n}
                className="flex items-center gap-2 rounded-full border border-hairline bg-cod-soft py-1 pl-1 pr-3"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-wine font-display text-[11px] text-parchment ring-1 ring-[color-mix(in_srgb,var(--gold)_60%,var(--surface))]">
                  {p?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    n.charAt(0).toUpperCase()
                  )}
                </span>
                <span className="font-body text-[13px] text-ink">
                  {n}
                  {p?.isDm ? <span className="text-muted"> (DM)</span> : null}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      <AnnotationThread
        campaignId={campaignId}
        sessionId={sessionId}
        anchor={anchor}
        excerpt={excerpt(names.join(", "), 60)}
        annotations={annotations}
      />
    </div>
  );
}

/** Merge per-anchor reaction tallies into one list for a whole chapter. */
function mergeReactions(byAnchor: Record<string, Reaction[]>, anchors: string[]): Reaction[] {
  const out: Reaction[] = [];
  for (const a of anchors) {
    for (const r of byAnchor[a] ?? []) {
      const found = out.find((x) => x.emoji === r.emoji);
      if (found) {
        found.count += r.count;
        found.mine ||= r.mine;
        found.names.push(...r.names);
      } else {
        out.push({ ...r, names: [...r.names] });
      }
    }
  }
  return out;
}

/**
 * A heading and its body, as one readable run of prose.
 *
 * Paragraphs inside are deliberately NOT boxed or tinted: separating every
 * one made the page read as a stack of cards rather than a chronicle. The
 * chapter is the hover target instead, so the controls have somewhere to
 * live without cutting the text apart.
 *
 * Comments and reactions written before this grouping existed are anchored
 * to individual paragraphs, so both are rolled up from every anchor in the
 * chapter; new ones land on the chapter's own anchor.
 */
function Chapter({
  chapter,
  session,
  campaignId,
}: {
  chapter: NoteChapter;
  session: SessionDetail;
  campaignId: string;
}) {
  const annotations = chapter.anchors.flatMap((a) => session.annotationsByAnchor[a] ?? []);
  const reactions = mergeReactions(session.reactionsByAnchor, chapter.anchors);
  const has = annotations.length > 0;
  const heading = chapter.heading;

  return (
    <div className="group relative">
      <div
        className={
          has
            ? "rounded-[10px] border-l-2 border-gold bg-cod-soft px-4 py-3"
            : "-mx-4 rounded-[10px] border-l-2 border-transparent px-4 py-2 transition-colors group-hover:border-hairline"
        }
      >
        {heading &&
          (heading.heading === 1 ? (
            <h3 className="mb-2 font-display text-[21px] font-semibold leading-snug text-ink">
              {renderCodexMentions(heading.text, campaignId)}
            </h3>
          ) : (
            <h4 className="mb-1.5 font-display text-[13px] font-semibold uppercase tracking-[0.07em] text-ink-soft">
              {renderCodexMentions(heading.text, campaignId)}
            </h4>
          ))}

        {/* Paragraphs flow: spacing separates them, nothing else. */}
        {chapter.blocks.map((b) =>
          b.divider ? (
            <hr key={b.anchor} className="mx-auto my-4 w-24 border-0 border-t border-hairline" />
          ) : (
            <p
              key={b.anchor}
              className="font-body text-[17px] leading-[1.75] text-ink [&+p]:mt-4"
            >
              {renderCodexMentions(b.text, campaignId)}
            </p>
          ),
        )}

        <ReactionBar
          campaignId={campaignId}
          sessionId={session.id}
          anchor={chapter.anchor}
          reactions={reactions}
        />
      </div>

      <AnnotationThread
        campaignId={campaignId}
        sessionId={session.id}
        anchor={chapter.anchor}
        excerpt={excerpt(heading?.text || chapter.blocks[0]?.text || "", 60)}
        annotations={annotations}
      />
    </div>
  );
}

// The editor writes NPC mentions as markdown links "[Name](codex:<uuid>)".
// The read view renders stored text verbatim (no markdown parsing), so this
// single pattern gets special-cased into a quiet wine link to the codex —
// everything else stays plain text, as before.
const CODEX_MENTION_RE =
  /\[([^\]]+)\]\(codex:([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)/g;

function renderCodexMentions(text: string, campaignId: string): React.ReactNode {
  if (!text.includes("](codex:")) return text;
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(CODEX_MENTION_RE)) {
    if (m.index! > last) parts.push(text.slice(last, m.index));
    parts.push(
      <Link
        key={`${m.index}-${m[2]}`}
        href={journal.npc(campaignId, m[2].toLowerCase())}
        className="text-wine underline decoration-[color-mix(in_srgb,var(--wine)_40%,transparent)] underline-offset-2 transition hover:decoration-wine"
      >
        {m[1]}
      </Link>,
    );
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
