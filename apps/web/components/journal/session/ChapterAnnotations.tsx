"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { AnnotationThread } from "./AnnotationControls";
import { useReactions } from "./useReactions";
import { REACTION_EMOJI } from "@/lib/journal/reactions";
import type { Annotation, Reaction } from "@/lib/journal/session-detail";

/** What a double-click applies. First of the set, so it's the one the picker
 *  also shows first — the gesture and the menu agree on what "react" means. */
const DEFAULT_EMOJI = REACTION_EMOJI[0];

/** How long the undo chip stays after a double-click reaction. */
const UNDO_MS = 6000;

/**
 * Everything you can do TO a chapter: react, comment, and see who already has.
 *
 * The affordance used to appear only on hover, which meant that on a phone it
 * did not exist at all, and on a desktop you had to already know it was there.
 * It's now a permanent (if quiet) mark in the margin, so the page shows where
 * annotation is possible before you try. Reacting also has a gesture —
 * double-click — because a reaction that costs two clicks through a menu
 * doesn't get used.
 *
 * The prose is passed as children so this component can own the hover group,
 * the margin column and the double-click target in one place.
 */
export function ChapterAnnotations({
  campaignId,
  sessionId,
  anchor,
  excerpt,
  annotations,
  reactions,
  onRail = false,
  children,
}: {
  campaignId: string;
  sessionId: string;
  anchor: string;
  excerpt: string;
  annotations: Annotation[];
  reactions: Reaction[];
  /** On the rail the gutter already sets the left edge, so the block must not
   *  pull itself back out with a negative margin. */
  onRail?: boolean;
  children: React.ReactNode;
}) {
  const { reactions: local, react, isMine } = useReactions(
    campaignId,
    sessionId,
    anchor,
    reactions,
  );
  const [menu, setMenu] = useState(false);
  const [thread, setThread] = useState(false);
  const [undo, setUndo] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  function flashUndo(emoji: string) {
    setUndo(emoji);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setUndo(null), UNDO_MS);
  }

  function onDoubleClick(e: React.MouseEvent) {
    // A double-click on a link is the browser's, not ours.
    if ((e.target as HTMLElement).closest("a,button,input,textarea")) return;
    if (react(DEFAULT_EMOJI) === "added") flashUndo(DEFAULT_EMOJI);
    else setUndo(null);
  }

  const people: Annotation[] = [];
  for (const a of annotations) {
    if (!people.some((p) => p.authorName === a.authorName)) people.push(a);
  }
  const shown = people.slice(0, 3);
  const extra = people.length - shown.length;

  return (
    <div className="group relative">
      <div
        className={`grid grid-cols-[minmax(0,1fr)] gap-x-4 lg:grid-cols-[minmax(0,1fr)_auto] ${
          onRail
            ? "rounded-[10px] py-2 transition-colors"
            : "-mx-4 rounded-[10px] border-l-2 border-transparent px-4 py-2 transition-colors group-hover:border-hairline"
        }`}
      >
        <div className="lg:col-start-1">
          {/* Double-click anywhere in the prose reacts. It's on the wrapper
              rather than each paragraph so the heading and the gaps between
              paragraphs count too. */}
          <div onDoubleClick={onDoubleClick}>{children}</div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {local.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => react(r.emoji)}
                title={`${r.names.join(", ")}${r.mine ? " — click to remove yours" : ""}`}
                aria-pressed={r.mine}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-body text-[12px] transition ${
                  r.mine
                    ? "border-gold bg-[color-mix(in_srgb,var(--gold)_16%,transparent)] text-ink"
                    : "border-hairline bg-cod-soft text-ink-soft hover:border-gold"
                }`}
              >
                <span aria-hidden="true">{r.emoji}</span>
                <span className="tabular-nums">{r.count}</span>
              </button>
            ))}

            {/* A double-click is easy to do by accident while reading, so the
                write always announces itself and stays revocable for a moment. */}
            {undo && (
              <span
                role="status"
                className="flex items-center gap-1.5 font-body text-[11px] text-muted"
              >
                Reacted {undo}
                <button
                  type="button"
                  onClick={() => {
                    react(undo);
                    setUndo(null);
                  }}
                  className="underline underline-offset-2 hover:text-ink"
                >
                  Undo
                </button>
              </span>
            )}
          </div>

          {/* Opened from the margin control when nobody has commented yet;
              once there are comments the thread lives beside the faces. */}
          {thread && annotations.length === 0 && (
            <AnnotationThread
              campaignId={campaignId}
              sessionId={sessionId}
              anchor={anchor}
              excerpt={excerpt}
              annotations={annotations}
              startOpen
              onClose={() => setThread(false)}
            />
          )}
        </div>

        {/* The margin: the annotate control, and beneath it whoever has
            already spoken. Below `lg` there is no margin to sit in, so the
            column drops under the text rather than squeezing the measure. */}
        <div className="mt-2 flex items-center gap-2 lg:col-start-2 lg:row-start-1 lg:mt-1 lg:w-[26px] lg:flex-col lg:items-start lg:gap-1.5">
          <div className="relative">
            <button
              type="button"
              aria-label="React or comment"
              aria-haspopup="menu"
              aria-expanded={menu}
              onClick={() => setMenu((v) => !v)}
              // Always present, but at a weight that reads as an edge mark
              // rather than a button competing with the prose.
              className={`flex h-[26px] w-[26px] items-center justify-center rounded-full border border-hairline bg-surface text-ink-soft transition hover:border-gold hover:text-ink hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100 ${
                menu ? "border-gold opacity-100" : "opacity-40"
              }`}
            >
              <MessageSquarePlus size={13} />
            </button>

            {menu && (
              <>
                <button
                  type="button"
                  aria-label="Close"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setMenu(false)}
                />
                <div
                  role="menu"
                  className="absolute left-0 top-8 z-20 flex w-max flex-col gap-1 rounded-xl border border-hairline bg-surface p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] lg:left-auto lg:right-0"
                >
                  <div className="flex gap-0.5">
                    {REACTION_EMOJI.map((e) => {
                      const mine = isMine(e);
                      return (
                        <button
                          key={e}
                          type="button"
                          role="menuitemcheckbox"
                          aria-checked={mine}
                          onClick={() => {
                            react(e);
                            setMenu(false);
                          }}
                          title={mine ? `Remove ${e}` : `React with ${e}`}
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-[16px] transition hover:bg-cod-soft ${
                            mine ? "bg-[color-mix(in_srgb,var(--gold)_20%,transparent)]" : ""
                          }`}
                        >
                          <span aria-hidden="true">{e}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenu(false);
                      setThread(true);
                    }}
                    className="rounded-lg px-2 py-1.5 text-left font-body text-[12px] text-ink-soft transition hover:bg-cod-soft hover:text-ink"
                  >
                    Add a comment…
                  </button>
                </div>
              </>
            )}
          </div>

          {annotations.length > 0 && (
            <CommentFaces
              campaignId={campaignId}
              sessionId={sessionId}
              anchor={anchor}
              excerpt={excerpt}
              annotations={annotations}
              people={shown}
              extra={extra}
              open={thread}
              onToggle={() => setThread((v) => !v)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Who commented, and their thread opened in place.
 *
 * Clicking a face used to be a link down to a thread at the foot of the
 * chapter, which threw the viewport past all the prose to reach it. The
 * comments now open where the faces are, so clicking never moves the page.
 */
function CommentFaces({
  campaignId,
  sessionId,
  anchor,
  excerpt,
  annotations,
  people,
  extra,
  open,
  onToggle,
}: {
  campaignId: string;
  sessionId: string;
  anchor: string;
  excerpt: string;
  annotations: Annotation[];
  people: Annotation[];
  extra: number;
  open: boolean;
  onToggle: () => void;
}) {
  const label = `${annotations.length} ${
    annotations.length === 1 ? "comment" : "comments"
  } — ${people.map((p) => p.authorName).join(", ")}`;

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        title={label}
        aria-label={label}
        aria-expanded={open}
        className="flex shrink-0 items-center"
      >
        {people.map((p, i) => (
          <span
            key={p.id}
            className={`flex h-[26px] w-[26px] items-center justify-center overflow-hidden rounded-full bg-wine font-display text-[11px] text-parchment ring-2 transition ${
              open ? "ring-gold" : "ring-surface"
            } ${i > 0 ? "-ml-2.5" : ""}`}
          >
            {p.authorAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.authorAvatar} alt="" className="h-full w-full object-cover" />
            ) : (
              p.authorName.charAt(0).toUpperCase()
            )}
          </span>
        ))}
        {extra > 0 && (
          <span className="-ml-2.5 flex h-[26px] items-center justify-center rounded-full bg-cod-soft px-1.5 font-body text-[10px] text-ink-soft ring-2 ring-surface">
            +{extra}
          </span>
        )}
      </button>

      {open && (
        // On a wide screen the margin is only as wide as the avatars, so the
        // panel is pulled out to a readable width and anchored to their right
        // edge; on narrow screens it's simply the full column.
        <div className="mt-1.5 w-full lg:absolute lg:right-0 lg:z-20 lg:w-[320px] lg:rounded-xl lg:border lg:border-hairline lg:bg-surface lg:p-3 lg:shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
          <AnnotationThread
            campaignId={campaignId}
            sessionId={sessionId}
            anchor={anchor}
            excerpt={excerpt}
            annotations={annotations}
          />
        </div>
      )}
    </>
  );
}
