"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Extension } from "@tiptap/react";
import Suggestion, { type SuggestionProps } from "@tiptap/suggestion";
import { UserRound, Plus, Loader2 } from "lucide-react";

/** The minimal NPC shape the editor needs for @-mentions. */
export type MentionNpc = { id: string; name: string };

export type MentionState = {
  query: string;
  items: MentionNpc[];
  clientRect: () => DOMRect | null;
  /** Inserts the mention (text with a codex: link mark) at the @-range. */
  command: (npc: MentionNpc) => void;
};

function toState(p: SuggestionProps<MentionNpc, MentionNpc>): MentionState | null {
  const rect = p.clientRect;
  if (!rect) return null;
  return {
    query: p.query,
    items: p.items,
    clientRect: () => rect() ?? null,
    command: p.command,
  };
}

/**
 * Typing "@" opens the NPC dropdown. Mentions are inserted as plain text
 * carrying a Link mark with href "codex:<npc-id>" — tiptap-markdown
 * serializes that natively as [Name](codex:id), so mentions survive the
 * markdown round-trip without a custom node (a custom Mention node would be
 * silently dropped by getMarkdown()). Requires Link.configure({ protocols:
 * ["codex"] }) — the Link extension strips unknown protocols otherwise.
 */
export function buildMentionExtension(opts: {
  getNpcs: () => MentionNpc[];
  onState: (state: MentionState | null) => void;
  onKeyDown: (event: KeyboardEvent) => boolean;
}) {
  return Extension.create({
    name: "npcMention",
    addProseMirrorPlugins() {
      return [
        Suggestion<MentionNpc, MentionNpc>({
          editor: this.editor,
          char: "@",
          // NPC names contain spaces ("Arroth Tepherok") — keep the query
          // open across spaces; Escape or a selection closes it.
          allowSpaces: true,
          command: ({ editor, range, props }) => {
            editor
              .chain()
              .focus()
              .insertContentAt(range, [
                {
                  type: "text",
                  text: props.name,
                  marks: [{ type: "link", attrs: { href: `codex:${props.id}` } }],
                },
                { type: "text", text: " " },
              ])
              .run();
          },
          items: ({ query }) => {
            const q = query.trim().toLowerCase();
            return opts
              .getNpcs()
              .filter((n) => n.name.toLowerCase().includes(q))
              .slice(0, 8);
          },
          render: () => ({
            onStart: (p) => opts.onState(toState(p)),
            onUpdate: (p) => opts.onState(toState(p)),
            onKeyDown: (p) => {
              if (p.event.key === "Escape") {
                opts.onState(null);
                return true;
              }
              return opts.onKeyDown(p.event);
            },
            onExit: () => opts.onState(null),
          }),
        }),
      ];
    },
  });
}

export type MentionDropdownHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

/**
 * The @-mention dropdown — a fixed-position portal anchored to the caret
 * (no tippy dependency). Keyboard events arrive via the imperative handle
 * from the suggestion plugin; mouse selection uses onMouseDown so the
 * editor never loses focus.
 */
export const MentionDropdown = forwardRef<
  MentionDropdownHandle,
  {
    state: MentionState;
    /** Creates the NPC, then inserts its mention. */
    onCreate: (name: string) => void;
    creating: boolean;
  }
>(function MentionDropdown({ state, onCreate, creating }, ref) {
  const [active, setActive] = useState(0);
  const query = state.query.trim();
  const canCreate =
    query.length > 0 &&
    !state.items.some((n) => n.name.toLowerCase() === query.toLowerCase());
  const total = state.items.length + (canCreate ? 1 : 0);

  useEffect(() => setActive(0), [state.query]);

  function choose(index: number) {
    if (index < state.items.length) state.command(state.items[index]);
    else if (canCreate) onCreate(query);
  }

  useImperativeHandle(ref, () => ({
    onKeyDown(event) {
      if (total === 0) return false;
      if (event.key === "ArrowDown") {
        setActive((a) => (a + 1) % total);
        return true;
      }
      if (event.key === "ArrowUp") {
        setActive((a) => (a - 1 + total) % total);
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        choose(active);
        return true;
      }
      return false;
    },
  }));

  const rect = state.clientRect();
  if (!rect || total === 0) return null;

  const row =
    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left font-body text-[13px] text-ink transition";

  return createPortal(
    <div
      style={{ position: "fixed", top: rect.bottom + 6, left: rect.left, zIndex: 60 }}
      className="w-60 rounded-xl border border-hairline bg-surface p-1 shadow-[0_8px_32px_-8px_rgba(43,33,24,0.35)]"
    >
      {state.items.map((n, i) => (
        <button
          key={n.id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            choose(i);
          }}
          onMouseEnter={() => setActive(i)}
          className={`${row} ${i === active ? "bg-cod-soft" : ""}`}
        >
          <UserRound size={13} className="shrink-0 text-muted" />
          <span className="truncate">{n.name}</span>
        </button>
      ))}
      {canCreate && (
        <button
          type="button"
          disabled={creating}
          onMouseDown={(e) => {
            e.preventDefault();
            choose(state.items.length);
          }}
          onMouseEnter={() => setActive(state.items.length)}
          className={`${row} ${active === state.items.length ? "bg-cod-soft" : ""} text-wine disabled:opacity-60`}
        >
          {creating ? (
            <Loader2 size={13} className="shrink-0 animate-spin" />
          ) : (
            <Plus size={13} className="shrink-0" />
          )}
          <span className="truncate">Create &ldquo;{query}&rdquo;</span>
        </button>
      )}
    </div>,
    document.body,
  );
});
