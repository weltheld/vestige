"use client";

import { useState } from "react";
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

export function SectionEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (markdown: string) => void;
  placeholder: string;
}) {
  const [focused, setFocused] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({ placeholder }),
      Markdown.configure({ html: false }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.storage.markdown.getMarkdown()),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    editorProps: {
      attributes: {
        class:
          "min-h-[100px] w-full font-body text-[15px] leading-[1.85] text-ink outline-none [&_p.is-editor-empty:first-child::before]:text-muted [&_p.is-editor-empty:first-child::before]:italic [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:h-0 [&_p.is-editor-empty:first-child::before]:pointer-events-none [&_ul]:list-disc [&_ul]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-gold [&_blockquote]:pl-3 [&_blockquote]:italic",
      },
    },
  });

  return (
    <div
      className={`relative border-b ${focused ? "border-hairline" : "border-transparent"} pb-2`}
    >
      {focused && editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn = "flex h-7 w-7 items-center justify-center rounded transition hover:bg-cod-soft";
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
      <button
        type="button"
        className={btn}
        onClick={() => {
          const url = window.prompt("Image URL");
          if (url) editor.chain().focus().setImage({ src: url }).run();
        }}
      >
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
