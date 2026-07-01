"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ImagePlus, X } from "lucide-react";
import { postComment } from "@/app/c/[campaignId]/s/actions";
import { pickImageFile, uploadJournalImage } from "@/lib/upload";
import type { Comment } from "@/lib/session-threads";

const SECTIONS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "summary", label: "Summary" },
  { key: "player_characters", label: "Player Characters" },
  { key: "npcs", label: "NPCs" },
  { key: "notes", label: "Notes" },
];

function sectionLabel(anchor: string | null) {
  if (!anchor) return "General";
  return SECTIONS.find((s) => s.key === anchor)?.label ?? anchor;
}

function Avatar({ url, name, size }: { url: string | null; name: string; size: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-wine font-display text-parchment ring-2 ring-gold"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}

export function Comments({
  comments,
  campaignId,
  sessionId,
}: {
  comments: Comment[];
  campaignId: string;
  sessionId: string;
}) {
  const router = useRouter();
  const [section, setSection] = useState("all");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const visible = section === "all" ? comments : comments.filter((c) => c.sectionAnchor === section);

  // Group by section for display.
  const groups = new Map<string | null, Comment[]>();
  for (const c of visible) {
    const k = c.sectionAnchor;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(c);
  }
  const groupKeys =
    section === "all" ? [...groups.keys()] : [section as string | null];

  async function post(
    sectionAnchor: string | null,
    body: string,
    imageUrl: string | null,
    parent: string | null = null,
  ) {
    if (!body.trim() && !imageUrl) return;
    await postComment(campaignId, sessionId, sectionAnchor, body.trim(), parent, imageUrl);
    setReplyTo(null);
    router.refresh();
  }

  return (
    <div className="pt-6">
      {/* Section chips */}
      <div className="flex flex-wrap gap-2 pb-5">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSection(s.key)}
            className={`rounded-md px-3.5 py-2 font-display text-[11px] font-semibold uppercase tracking-[0.04em] ${
              section === s.key ? "bg-cod-soft text-wine" : "text-ink-soft hover:text-ink"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {groupKeys.map((key) => {
          const all = groups.get(key) ?? [];
          const roots = all.filter((c) => !c.parentCommentId);
          const repliesOf = (id: string) => all.filter((c) => c.parentCommentId === id);
          return (
            <div key={String(key)} className="flex flex-col gap-4 rounded-xl bg-[#faf5e6] p-[22px]">
              <div className="flex items-center">
                <span className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                  Discussion on: {sectionLabel(key)}
                </span>
                <span className="ml-auto font-body text-[11px] text-muted">
                  {all.length} {all.length === 1 ? "comment" : "comments"}
                </span>
              </div>
              <div className="h-px bg-hairline" />

              {roots.length === 0 && (
                <p className="font-body text-[13px] italic text-muted">No comments yet on this section.</p>
              )}

              {roots.map((c) => (
                <div key={c.id} className="flex flex-col gap-3">
                  <CommentRow c={c} size={34} />
                  <button
                    type="button"
                    onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                    className="ml-[46px] w-fit font-body text-[11px] text-ink-soft underline"
                  >
                    Reply
                  </button>
                  {repliesOf(c.id).map((r) => (
                    <div key={r.id} className="ml-[46px]">
                      <CommentRow c={r} size={28} />
                    </div>
                  ))}
                  {replyTo === c.id && (
                    <div className="ml-[46px]">
                      <Composer
                        campaignId={campaignId}
                        onPost={(body, imageUrl) => post(c.sectionAnchor, body, imageUrl, c.id)}
                        placeholder="Write a reply…"
                      />
                    </div>
                  )}
                </div>
              ))}

              <div className="h-px bg-hairline" />
              <Composer
                campaignId={campaignId}
                onPost={(body, imageUrl) => post(key, body, imageUrl)}
                placeholder="Add to the conversation…"
              />
            </div>
          );
        })}
        {groupKeys.length === 0 && (
          <div className="rounded-xl bg-[#faf5e6] p-[22px]">
            <p className="pb-3 font-body text-[13px] italic text-muted">No comments yet on this section.</p>
            <Composer
              campaignId={campaignId}
              onPost={(body, imageUrl) => post(section === "all" ? null : section, body, imageUrl)}
              placeholder="Add to the conversation…"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function CommentRow({ c, size }: { c: Comment; size: number }) {
  return (
    <div className="flex gap-3">
      <Avatar url={c.authorAvatar} name={c.authorName} size={size} />
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-display text-[13px] text-ink">{c.authorName}</span>
          <span className="font-body text-[11px] text-muted">{format(parseISO(c.createdAt), "MMM d, h:mmaaa")}</span>
        </div>
        {c.body && <p className="font-body text-[14px] leading-[1.65] text-ink">{c.body}</p>}
        {c.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.imageUrl}
            alt=""
            className="mt-1 max-h-[120px] max-w-[200px] rounded-lg object-cover"
          />
        )}
      </div>
    </div>
  );
}

function Composer({
  campaignId,
  onPost,
  placeholder,
}: {
  campaignId: string;
  onPost: (body: string, imageUrl: string | null) => void;
  placeholder: string;
}) {
  const [body, setBody] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function attach() {
    const file = await pickImageFile();
    if (!file) return;
    setUploading(true);
    try {
      setPendingImage(await uploadJournalImage(campaignId, file));
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    onPost(body, pendingImage);
    setBody("");
    setPendingImage(null);
  }

  return (
    <div className="flex flex-col gap-2">
      {pendingImage && (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pendingImage} alt="" className="max-h-[100px] max-w-[160px] rounded-lg object-cover" />
          <button
            type="button"
            onClick={() => setPendingImage(null)}
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white"
          >
            <X size={11} />
          </button>
        </div>
      )}
      <div className="flex items-center gap-3">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={placeholder}
          className="h-9 flex-1 border-b border-hairline bg-transparent font-body text-[13px] italic text-ink outline-none placeholder:text-muted"
        />
        <button
          type="button"
          aria-label="Attach image"
          disabled={uploading}
          onClick={attach}
          className="flex h-9 w-9 items-center justify-center text-muted disabled:opacity-50"
        >
          <ImagePlus size={16} />
        </button>
        <button
          type="button"
          onClick={submit}
          className="rounded-lg bg-wine px-4 py-2 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white"
        >
          Post
        </button>
      </div>
    </div>
  );
}
