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
      StarterKit,
      // protocols: the Link extension strips hrefs with unknown schemes in
      // parseHTML/renderHTML — without "codex" every NPC mention would be
      // silently destroyed the next time the editor loads.
      Link.configure({ openOnClick: false, protocols: ["codex"] }),
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
        class:
          "min-h-[100px] w-full font-body text-[15px] leading-[1.85] text-ink outline-none [&_p.is-editor-empty:first-child::before]:text-muted [&_p.is-editor-empty:first-child::before]:italic [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:h-0 [&_p.is-editor-empty:first-child::before]:pointer-events-none [&_ul]:list-disc [&_ul]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-gold [&_blockquote]:pl-3 [&_blockquote]:italic [&_a]:text-wine [&_a]:underline [&_a]:decoration-wine/40 [&_a]:underline-offset-2",
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

function Toolbar({ editor, campaignId }: { editor: Editor; campaignId: string }) {
  const [uploading, setUploading] = useState(false);
  const btn = "flex h-7 w-7 items-center justify-center rounded transition hover:bg-cod-soft disabled:opacity-50";

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
      <button type="button" className={btn} onClick={() => editor.chain().focus().toggleBold().run()}>
        <BoldIcon size={14} className="text-ink-soft" />
      </button>
      <button type="button" className={btn} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <ItalicIcon size={14} className="text-ink-soft" />
      </button>
      <button type="button" className={btn} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <ListIcon size={14} className="text-ink-soft" />
      </button>
      <button type="button" className={btn} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <QuoteIcon size={14} className="text-ink-soft" />
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
