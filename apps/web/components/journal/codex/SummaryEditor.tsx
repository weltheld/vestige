"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import {
  buildMentionExtension,
  MentionDropdown,
  type MentionDropdownHandle,
  type MentionNpc,
  type MentionState,
} from "../session/MentionSuggestion";

/**
 * tiptap-markdown escapes literal brackets ("\[1\]") on serialize, which
 * would break the codex footnote markers and their parser. Mention links
 * ([Name](codex:id)) are emitted by the serializer itself and never escaped,
 * so plain unescaping of brackets is safe here.
 */
function unescapeBrackets(md: string): string {
  return md.replace(/\\([[\]])/g, "$1");
}

/**
 * The codex summary editor — the journal SectionEditor's little sibling:
 * same @-mention crosslinking (codex entries AND journal sessions), no
 * toolbar/images, so the stored summary stays close to plain text. Mentions
 * serialize as [Name](codex:<id>) / [Title](session:<id>) markdown links —
 * the exact form the journal editor writes, so both views render them alike.
 */
export function SummaryEditor({
  value,
  onChange,
  placeholder,
  targets,
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  /** Codex entries + journal sessions offered by the @-dropdown. */
  targets: MentionNpc[];
}) {
  const [focused, setFocused] = useState(false);
  const [mention, setMention] = useState<MentionState | null>(null);
  const dropdownRef = useRef<MentionDropdownHandle | null>(null);

  const targetsRef = useRef(targets);
  targetsRef.current = targets;

  const [mentionExtension] = useState(() =>
    buildMentionExtension({
      getNpcs: () => targetsRef.current,
      onState: setMention,
      onKeyDown: (event) => dropdownRef.current?.onKeyDown(event) ?? false,
    }),
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // Keep the surface close to a textarea — no headings/lists/quotes.
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      // Both mention protocols must be allowed or the Link extension strips
      // them on load, silently destroying existing crosslinks.
      Link.configure({ openOnClick: false, protocols: ["codex", "session"] }),
      Placeholder.configure({ placeholder }),
      Markdown.configure({ html: false }),
      mentionExtension,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(unescapeBrackets(editor.storage.markdown.getMarkdown())),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    editorProps: {
      attributes: {
        class:
          "min-h-[150px] w-full font-body text-[15px] leading-[1.7] text-ink outline-none [&_p.is-editor-empty:first-child::before]:text-muted [&_p.is-editor-empty:first-child::before]:italic [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:h-0 [&_p.is-editor-empty:first-child::before]:pointer-events-none [&_a]:text-wine [&_a]:underline [&_a]:decoration-wine/40 [&_a]:underline-offset-2",
      },
    },
  });

  return (
    <div
      className={`relative rounded-md border px-3 py-2.5 transition ${
        focused ? "border-gold" : "border-hairline"
      }`}
    >
      <EditorContent editor={editor} />
      <p className="mt-1.5 font-body text-[10px] text-muted">
        Type @ to link a codex entry or session.
      </p>
      {mention && <MentionDropdown ref={dropdownRef} state={mention} />}
    </div>
  );
}
