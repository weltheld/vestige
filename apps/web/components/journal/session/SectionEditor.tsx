"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  List as ListIcon,
  Quote as QuoteIcon,
  ImagePlus,
  Link as LinkIcon,
  ChevronDown,
  Minus as DividerIcon,
} from "lucide-react";
import { pickImageFile, uploadJournalImage } from "@/lib/journal/upload";
import {
  buildMentionExtension,
  MentionDropdown,
  type MentionDropdownHandle,
  type MentionNpc,
  type MentionState,
} from "./MentionSuggestion";

export function SectionEditor({
  campaignId,
  value,
  onChange,
  placeholder,
  npcs = [],
  onCreateNpc,
}: {
  campaignId: string;
  value: string;
  onChange: (markdown: string) => void;
  placeholder: string;
  /** Campaign NPCs for the @-mention dropdown. */
  npcs?: MentionNpc[];
  /** Creates an NPC (server action) and returns it, or null on failure. */
  onCreateNpc?: (name: string) => Promise<MentionNpc | null>;
}) {
  const [focused, setFocused] = useState(false);
  const [mention, setMention] = useState<MentionState | null>(null);
  const [creating, setCreating] = useState(false);
  const dropdownRef = useRef<MentionDropdownHandle | null>(null);

  // The suggestion extension is created once but must always see the
  // freshest NPC list (it grows when "Create ..." is used mid-session).
  const npcsRef = useRef(npcs);
  npcsRef.current = npcs;

  const [mentionExtension] = useState(() =>
    buildMentionExtension({
      getNpcs: () => npcsRef.current,
      onState: setMention,
      onKeyDown: (event) => dropdownRef.current?.onKeyDown(event) ?? false,
    }),
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // Only the two heading levels the read view knows how to render (see
      // blocksFor / NotesBody) — offering h4–h6 would let people pick sizes
      // that come back looking identical.
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      // protocols: the Link extension strips hrefs with unknown schemes in
      // parseHTML/renderHTML — without "codex" every NPC mention would be
      // silently destroyed the next time the editor loads.
      Link.configure({ openOnClick: false, protocols: ["codex", "session"] }),
      Image,
      Placeholder.configure({ placeholder }),
      Markdown.configure({ html: false }),
      mentionExtension,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.storage.markdown.getMarkdown()),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    editorProps: {
      attributes: {
        // The heading rules mirror NotesBody's h3/h4 so the editor shows what
        // the saved page will look like — without them Tailwind's preflight
        // renders headings at body size and the block types are invisible.
        class:
          "min-h-[100px] w-full font-body text-[15px] leading-[1.85] text-ink outline-none [&_h2]:font-display [&_h2]:text-[19px] [&_h2]:font-semibold [&_h2]:leading-snug [&_h2]:text-ink [&_h3]:font-display [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:uppercase [&_h3]:tracking-[0.07em] [&_h3]:text-ink-soft [&_hr]:mx-auto [&_hr]:my-3 [&_hr]:w-24 [&_hr]:border-t [&_hr]:border-hairline [&_p.is-editor-empty:first-child::before]:text-muted [&_p.is-editor-empty:first-child::before]:italic [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:h-0 [&_p.is-editor-empty:first-child::before]:pointer-events-none [&_ul]:list-disc [&_ul]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-gold [&_blockquote]:pl-3 [&_blockquote]:italic [&_a]:text-wine [&_a]:underline [&_a]:decoration-[color-mix(in_srgb,var(--wine)_40%,transparent)] [&_a]:underline-offset-2",
      },
    },
  });

  async function createFromQuery(name: string) {
    if (!onCreateNpc || !mention) return;
    setCreating(true);
    try {
      const npc = await onCreateNpc(name);
      // mention may have been re-rendered while awaiting — use latest state.
      if (npc) mention.command(npc);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      className={`relative border-b ${focused ? "border-hairline" : "border-transparent"} pb-2`}
    >
      {focused && editor && <Toolbar editor={editor} campaignId={campaignId} />}
      <EditorContent editor={editor} />
      {mention && (
        <MentionDropdown
          ref={dropdownRef}
          state={mention}
          creating={creating}
          onCreate={createFromQuery}
        />
      )}
    </div>
  );
}

/** The block types a section can hold, in the order they appear in the menu. */
const BLOCK_TYPES = [
  { id: "paragraph", label: "Body copy", hint: "Normal paragraph text" },
  { id: "h2", label: "Heading", hint: "Breaks a long section into parts" },
  { id: "h3", label: "Subheading", hint: "A smaller label inside a part" },
] as const;

type BlockTypeId = (typeof BLOCK_TYPES)[number]["id"];

function activeBlockType(editor: Editor): BlockTypeId {
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  return "paragraph";
}

function setBlockType(editor: Editor, id: BlockTypeId) {
  const chain = editor.chain().focus();
  if (id === "paragraph") chain.setParagraph().run();
  else chain.setNode("heading", { level: id === "h2" ? 2 : 3 }).run();
}

/** Text / Heading / Subheading picker. A menu rather than two more icon
 *  buttons: block type is one choice with one answer, and naming the options
 *  is what makes "this is copy, that is a heading" legible. */
function BlockTypeMenu({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const active = activeBlockType(editor);
  const current = BLOCK_TYPES.find((t) => t.id === active) ?? BLOCK_TYPES[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Block type"
        className="flex h-7 items-center gap-1 rounded px-2 font-display text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-soft transition hover:bg-cod-soft"
      >
        {current.label}
        <ChevronDown size={11} />
      </button>
      {open && (
        <>
          {/* click-away; onMouseDown-prevented by the toolbar so focus stays put */}
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute left-0 top-8 z-20 w-56 overflow-hidden rounded-lg border border-hairline bg-surface py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
          >
            {BLOCK_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="menuitemradio"
                aria-checked={t.id === active}
                onClick={() => {
                  setBlockType(editor, t.id);
                  setOpen(false);
                }}
                className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition hover:bg-cod-soft ${
                  t.id === active ? "bg-cod-soft" : ""
                }`}
              >
                <span
                  className={
                    t.id === "h2"
                      ? "font-display text-[16px] font-semibold text-ink"
                      : t.id === "h3"
                        ? "font-display text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-soft"
                        : "font-body text-[14px] text-ink"
                  }
                >
                  {t.label}
                </span>
                <span className="font-body text-[11px] text-muted">{t.hint}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Toolbar({ editor, campaignId }: { editor: Editor; campaignId: string }) {
  const [uploading, setUploading] = useState(false);
  const btn = "flex h-7 w-7 items-center justify-center rounded transition hover:bg-cod-soft disabled:opacity-50";
  /** Marks/nodes that are on get a filled background, so the toolbar reports
   *  state instead of only issuing commands. */
  const state = (on: boolean) => `${btn} ${on ? "bg-cod-soft text-wine" : "text-ink-soft"}`;

  async function insertImage() {
    const file = await pickImageFile();
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadJournalImage(campaignId, file);
      editor.chain().focus().setImage({ src: url }).run();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      // keep focus in the editor when clicking toolbar buttons
      onMouseDown={(e) => e.preventDefault()}
      className="absolute -top-10 right-0 z-10 flex items-center gap-0.5 rounded-lg border border-hairline bg-surface p-1 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
    >
      <BlockTypeMenu editor={editor} />
      <span className="mx-0.5 h-4 w-px bg-hairline" />
      <button
        type="button"
        title="Bold"
        className={state(editor.isActive("bold"))}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <BoldIcon size={14} />
      </button>
      <button
        type="button"
        title="Italic"
        className={state(editor.isActive("italic"))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <ItalicIcon size={14} />
      </button>
      <button
        type="button"
        title="Bulleted list"
        className={state(editor.isActive("bulletList"))}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <ListIcon size={14} />
      </button>
      <button
        type="button"
        title="Quote"
        className={state(editor.isActive("blockquote"))}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <QuoteIcon size={14} />
      </button>
      <button
        type="button"
        title="Divider"
        className={`${btn} text-ink-soft`}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <DividerIcon size={14} />
      </button>
      <span className="mx-0.5 h-4 w-px bg-hairline" />
      <button type="button" className={btn} disabled={uploading} onClick={insertImage}>
        <ImagePlus size={14} className="text-ink-soft" />
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => {
          const url = window.prompt("Link URL");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
      >
        <LinkIcon size={14} className="text-ink-soft" />
      </button>
    </div>
  );
}
