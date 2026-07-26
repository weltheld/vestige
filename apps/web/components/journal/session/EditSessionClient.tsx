"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { DayPicker } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { Pencil, ChevronDown, ImagePlus, Info, X, Check, CalendarDays, Trash2 } from "lucide-react";
import { NOTE_SECTIONS } from "@/lib/journal/notes";
import { journal } from "@/lib/journal/links";
import {
  createSession,
  saveSession,
  deleteSession,
  addSessionImage,
  removeSessionImage,
  setSessionCoverImage,
  type SessionInput,
} from "@/app/journal/c/[campaignId]/s/actions";
import dynamic from "next/dynamic";
import { pickImageFile, uploadJournalImage } from "@/lib/journal/upload";
import { createNpc } from "@/app/journal/c/[campaignId]/codex/actions";
import type { MentionNpc } from "./MentionSuggestion";
// Calendar's pan/zoom cropper — shared since the app merge. The session
// cover renders in a fixed 4:3 card, so uploads get cropped to match
// instead of letterboxing.
import { ImageCropper } from "@/components/council/ImageCropper";

// The tiptap editor stack is ~2/3 of this route's JS. Loading it lazily
// (client-only) lets the page shell, sidebar, and title field paint first;
// each editor hydrates a moment later behind a same-sized placeholder.
const SectionEditor = dynamic(
  () => import("./SectionEditor").then((m) => m.SectionEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[96px] animate-pulse rounded-md bg-[color-mix(in_srgb,var(--ink)_6%,var(--surface))]" />
    ),
  },
);

type EditPlayer = { userId: string; characterName: string; avatarUrl: string | null; isDm: boolean };

type EditSessionImage = { id: string; url: string };

type Props = {
  campaignId: string;
  sessionId: string | null;
  initial: SessionInput;
  images: EditSessionImage[];
  /** When this session was last written (ISO). Null for a session that
   *  doesn't exist yet — there's nothing saved to report. */
  lastSavedAt?: string | null;
  chroniclerName: string;
  modulesCalendar: boolean;
  players: EditPlayer[];
  /** Campaign NPCs for the editors' @-mention dropdown. */
  npcs?: MentionNpc[];
};

/** "Last saved" wants to answer "is my work safe?" at a glance. Today's saves
 *  show a clock time; anything older carries the date, because "14:32" alone
 *  is misleading once a day has passed. */
function formatSavedAt(d: Date): string {
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  return sameDay ? format(d, "HH:mm") : format(d, "d MMM, HH:mm");
}

const PLACEHOLDERS: Record<string, string> = {
  summary: "Begin with what happened. A few sentences are enough.",
  player_characters: "Who was at the table this session? Add notes about what they did.",
  npcs: "Faces met. Notable, frightening, useful.",
  notes: "Anything else worth remembering — quotes, decisions, loot, foreshadowing.",
};

export function EditSessionClient({
  campaignId,
  sessionId,
  initial,
  images,
  lastSavedAt = null,
  chroniclerName,
  modulesCalendar,
  players,
  npcs: initialNpcs = [],
}: Props) {
  const router = useRouter();
  const [fields, setFields] = useState<SessionInput>(initial);
  // Grows when a new NPC is created from the @-mention dropdown, so it's
  // immediately mentionable again without a reload.
  const [npcs, setNpcs] = useState<MentionNpc[]>(initialNpcs);
  const handleCreateNpc = async (name: string): Promise<MentionNpc | null> => {
    try {
      // Entities created mid-writing default to a person — the common case;
      // the kind can be changed on the codex entry afterwards.
      const { id } = await createNpc(campaignId, {
        name,
        summary: null,
        status: "unknown",
        imageUrl: null,
        kind: "person",
      });
      const npc = { id, name };
      setNpcs((prev) => [...prev, npc].sort((a, b) => a.name.localeCompare(b.name)));
      return npc;
    } catch {
      return null;
    }
  };
  const [localSessionId, setLocalSessionId] = useState(sessionId);
  // "pending" = edited, autosave debounce running; "saving" = a write is
  // actually in flight. Keeping these apart matters: the old code set
  // "saving" on every keystroke, three seconds before anything was written,
  // and the Save button is disabled while saving — so clicking Save right
  // after typing did nothing at all.
  const [saveState, setSaveState] = useState<"idle" | "pending" | "saving" | "saved">("idle");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverCropFile, setCoverCropFile] = useState<File | null>(null);
  // When the session was last written, as a real timestamp so the editor can
  // say *when* rather than only "saved". Seeded from the stored row so it's
  // already meaningful the moment the page opens.
  const [savedAt, setSavedAt] = useState<Date | null>(
    lastSavedAt ? new Date(lastSavedAt) : null,
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerPos, setDatePickerPos] = useState({ top: 0, left: 0 });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const firstRender = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const creating = useRef(false);
  // 0 => the next autosave always records a revision (baseline for the session).
  const lastRevisionAt = useRef(0);

  const set = (patch: Partial<SessionInput>) => setFields((f) => ({ ...f, ...patch }));

  // Autosave: debounced 3s draft persist. For a brand-new session, the first
  // autosave creates it (create-on-first-keystroke); after that it's a plain
  // update. Revisions are throttled to at most one per minute of continuous
  // editing — every autosave still persists the draft either way.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setSaveState("pending");
    timer.current = setTimeout(async () => {
      if (!localSessionId) {
        if (creating.current || !fields.title.trim()) {
          setSaveState("idle");
          return;
        }
        creating.current = true;
        setSaveState("saving");
        const id = await createSession(campaignId, fields);
        // A cover chosen before the session existed isn't in the gallery
        // yet (that table needs a real session id) — backfill it now.
        if (fields.image_url) await addSessionImage(campaignId, id, fields.image_url);
        creating.current = false;
        lastRevisionAt.current = Date.now();
        setLocalSessionId(id);
        setSaveState("saved");
        setSavedAt(new Date());
        router.replace(journal.editSession(campaignId, id));
        return;
      }
      const recordRevision = Date.now() - lastRevisionAt.current > 60_000;
      setSaveState("saving");
      await saveSession(campaignId, localSessionId, fields, recordRevision);
      if (recordRevision) lastRevisionAt.current = Date.now();
      setSaveState("saved");
      setSavedAt(new Date());
    }, 3000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [fields, localSessionId, campaignId, router]);

  async function handleSave() {
    // Cancel any pending autosave — otherwise its debounced timer can still
    // fire after this explicit save starts, racing it. Both paths guard
    // session creation with the same `creating` ref, so whichever runs
    // first "wins" and the other becomes a no-op instead of a duplicate.
    if (timer.current) clearTimeout(timer.current);
    if (creating.current) return;
    setSaveState("saving");
    try {
      if (localSessionId) {
        await saveSession(campaignId, localSessionId, fields, true);
        lastRevisionAt.current = Date.now();
        setSaveState("saved");
        setSavedAt(new Date());
        // Leave edit mode: an explicit "Save session" means "I'm done here".
        router.push(journal.session(campaignId, localSessionId));
      } else {
        creating.current = true;
        const id = await createSession(campaignId, fields);
        if (fields.image_url) await addSessionImage(campaignId, id, fields.image_url);
        creating.current = false;
        lastRevisionAt.current = Date.now();
        setSaveState("saved");
        setSavedAt(new Date());
        router.push(journal.session(campaignId, id));
      }
    } catch (err) {
      // Previously an error here left the button stuck disabled on "saving"
      // with nothing said, and the work looked lost. Hand the editor back.
      console.error("[save session]", err);
      creating.current = false;
      setSaveState("pending");
      setSaveError("Couldn't save. Your text is still here — try again.");
    }
  }

  async function uploadCroppedCover(blob: Blob) {
    setCoverCropFile(null);
    setUploadingCover(true);
    try {
      const file = new File([blob], "session-cover.jpg", { type: "image/jpeg" });
      const url = await uploadJournalImage(campaignId, file);
      set({ image_url: url });
      if (localSessionId) {
        await addSessionImage(campaignId, localSessionId, url);
        await setSessionCoverImage(campaignId, localSessionId, url);
        router.refresh();
      }
    } finally {
      setUploadingCover(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 pb-24 pt-6 sm:px-8 lg:px-12">
      {coverCropFile && (
        <ImageCropper
          file={coverCropFile}
          aspect={4 / 3}
          viewWidth={336}
          outputWidth={1200}
          title="Position the session image"
          hint="Drag to move, slide to zoom — cropped to the 4:3 card."
          onCancel={() => setCoverCropFile(null)}
          onConfirm={uploadCroppedCover}
        />
      )}
      {/* Hero edit dressing — a 4:3 thumbnail (fully visible, not cropped
          into an ultra-wide banner) beside the title/date fields. */}
      <section className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <button
          type="button"
          disabled={uploadingCover}
          onClick={async () => {
            const file = await pickImageFile();
            if (!file) return;
            // Crop to the card's 4:3 before uploading, so the cover fills
            // it instead of letterboxing.
            setCoverCropFile(file);
          }}
          className="group relative aspect-[4/3] w-full max-w-[280px] shrink-0 overflow-hidden rounded-xl bg-ink disabled:opacity-70"
        >
          {fields.image_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fields.image_url} alt="" className="absolute inset-0 h-full w-full object-contain" />
              <span className="absolute inset-0 hidden items-center justify-center gap-1.5 bg-black/40 font-body text-[12px] text-white group-hover:flex">
                <ImagePlus size={13} /> {uploadingCover ? "Uploading…" : "Change image"}
              </span>
            </>
          ) : (
            <span
              className="flex h-full w-full flex-col items-center justify-center gap-2"
              style={{ border: "1.5px dashed var(--gold)", background: "var(--cod-soft)" }}
            >
              <ImagePlus size={22} className="text-muted" />
              <span className="font-body text-[12px] italic text-muted">
                {uploadingCover ? "Uploading…" : "Add session image"}
              </span>
            </span>
          )}
        </button>

        <div className="flex-1 pt-1">
          <div className="flex items-center gap-2">
            <input
              value={fields.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="NEW SESSION TITLE"
              className="w-full border-b border-dashed border-hairline bg-transparent font-display text-[28px] italic text-ink outline-none placeholder:text-muted"
            />
            <Pencil size={14} className="shrink-0 text-ink-soft" />
          </div>
          <div className="relative mt-2">
            <button
              ref={dateButtonRef}
              type="button"
              onClick={() => {
                const rect = dateButtonRef.current?.getBoundingClientRect();
                if (rect) setDatePickerPos({ top: rect.bottom + 8, left: rect.left });
                setDatePickerOpen((o) => !o);
              }}
              className="flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-2.5 py-1 font-body text-[13px] text-ink"
            >
              {fields.date ? format(parseISO(fields.date), "MMMM d, yyyy") : "Pick a date"}
              <ChevronDown size={10} />
            </button>
            {datePickerOpen &&
              typeof document !== "undefined" &&
              createPortal(
                <>
                  <button
                    aria-label="Close date picker"
                    className="fixed inset-0 z-40"
                    onClick={() => setDatePickerOpen(false)}
                  />
                  <div
                    className="fixed z-50 rounded-xl border border-hairline bg-surface p-2 shadow-lg"
                    style={{ top: datePickerPos.top, left: datePickerPos.left }}
                  >
                    <DayPicker
                      mode="single"
                      selected={fields.date ? parseISO(fields.date) : undefined}
                      onSelect={(d) => {
                        set({ date: d ? format(d, "yyyy-MM-dd") : null });
                        setDatePickerOpen(false);
                      }}
                    />
                  </div>
                </>,
                document.body,
              )}
          </div>
        </div>
      </section>

      {/* Stacks on phones. As a plain flex row the 280px sidebar never gave
          way, so the editor column was squeezed to a few characters wide and
          the page was unusable on a phone. */}
      <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-start lg:gap-8">
        {/* Sidebar */}
        <aside className="flex w-full flex-col gap-4 lg:w-[280px] lg:shrink-0">
          <Card label="Session Info">
            <div>
              <p className="font-body text-[11px] text-muted">Date</p>
              <p className="font-body text-[14px] text-ink">
                {fields.date ? format(parseISO(fields.date), "MMMM d, yyyy") : "Not set"}
              </p>
            </div>
            <div>
              <p className="font-body text-[11px] text-muted">Chronicled by</p>
              <p className="font-body text-[14px] text-ink">{chroniclerName}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-gold-soft" />
              <span className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-gold">
                {saveState === "saved" ? "Saved" : "Draft"}
              </span>
            </div>
            <div>
              <p className="font-body text-[11px] text-muted">Last saved</p>
              <p className="font-body text-[14px] text-ink">
                {savedAt ? formatSavedAt(savedAt) : "Never"}
              </p>
            </div>
          </Card>

          {/* The former "In This Session" roster card was redundant with the
              Player Characters and NPCs sections of the recap body itself. */}

          <Card label="Session Images">
            <SessionImageGallery
              images={images}
              coverUrl={fields.image_url ?? null}
              disabled={!localSessionId}
              onUpload={async (file) => {
                if (!localSessionId) return;
                const url = await uploadJournalImage(campaignId, file);
                await addSessionImage(campaignId, localSessionId, url);
                set({ image_url: fields.image_url ?? url });
                router.refresh();
              }}
              onSetCover={async (url) => {
                if (!localSessionId) return;
                set({ image_url: url });
                await setSessionCoverImage(campaignId, localSessionId, url);
                router.refresh();
              }}
              onRemove={async (image) => {
                if (!localSessionId) return;
                if (fields.image_url === image.url) {
                  const fallback = images.find((i) => i.id !== image.id)?.url ?? null;
                  set({ image_url: fallback });
                }
                await removeSessionImage(campaignId, localSessionId, image.id);
                router.refresh();
              }}
            />
          </Card>

          {modulesCalendar && (
            <div className="flex items-center gap-2.5 rounded-[10px] bg-cod-soft px-3.5 py-3">
              <Info size={14} className="shrink-0 text-gold-soft" />
              <p className="font-body text-[12px] italic text-ink-soft">
                Calendar integration available after saving.
              </p>
            </div>
          )}
        </aside>

        {/* Composers */}
        <div className="min-w-0 flex-1">
          <div className="w-full max-w-[640px] border-b border-hairline">
            <span className="relative inline-block px-[18px] py-3 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">
              Recap
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-gold" />
            </span>
          </div>

          <div className="flex max-w-[640px] flex-col gap-9 pt-7">
            {NOTE_SECTIONS.map(({ key, label }) => (
              <section key={key} className="flex flex-col">
                <div className="flex items-center gap-2.5 pb-3">
                  <span className="h-3.5 w-0.5 bg-gold" />
                  <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                    {label}
                  </h2>
                </div>
                {key === "player_characters" ? (
                  <PresentPlayersEditor
                    value={fields.player_characters ?? ""}
                    players={players}
                    onChange={(md) => set({ player_characters: md })}
                  />
                ) : (
                  <SectionEditor
                    campaignId={campaignId}
                    value={(fields[key] as string | null) ?? ""}
                    onChange={(md) => set({ [key]: md } as Partial<SessionInput>)}
                    placeholder={PLACEHOLDERS[key]!}
                    npcs={npcs}
                    onCreateNpc={handleCreateNpc}
                  />
                )}
              </section>
            ))}
          </div>

          {/* Save bar */}
          <div className="mt-10 flex max-w-[640px] flex-wrap items-center justify-between gap-3 border-t border-hairline py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-soft" />
                <span className="font-body text-[12px] italic text-muted">
                  {saveState === "saving"
                    ? "Saving…"
                    : saveState === "pending"
                      ? "Unsaved changes…"
                      : savedAt
                        ? `Last saved ${formatSavedAt(savedAt)}`
                        : "Not saved yet"}
                </span>
              </div>
              {saveError && (
                <span className="font-body text-[12px] text-vote-no">{saveError}</span>
              )}
              {localSessionId && (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="flex items-center gap-1.5 font-body text-[11px] text-wine underline decoration-[color-mix(in_srgb,var(--wine)_40%,transparent)] underline-offset-2 hover:decoration-wine"
                >
                  <Trash2 size={12} /> Delete session
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    localSessionId ? journal.session(campaignId, localSessionId) : journal.campaign(campaignId),
                  )
                }
                className="rounded-lg border border-hairline px-[18px] py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSave}
                // Only while a write is actually in flight. Disabling on
                // "pending" is what made the button dead for three seconds
                // after every keystroke.
                disabled={saveState === "saving"}
                title="Save and return to the session"
                className="flex items-center gap-1.5 rounded-lg bg-wine px-[22px] py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-60"
              >
                <Check size={13} /> Save session
              </button>
            </div>
          </div>
        </div>
      </div>

      {deleteConfirmOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
              aria-label="Cancel"
              className="fixed inset-0 bg-[color-mix(in_srgb,var(--ink)_50%,transparent)] backdrop-blur-sm"
              onClick={() => !deleting && setDeleteConfirmOpen(false)}
            />
            <div className="relative w-full max-w-[380px] rounded-xl border border-hairline bg-surface p-6 shadow-parchment">
              <button
                type="button"
                onClick={() => !deleting && setDeleteConfirmOpen(false)}
                aria-label="Close"
                className="absolute right-3 top-3 rounded-md p-1 text-ink-soft hover:bg-cod-soft hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="font-display text-lg text-ink">Delete this session?</h2>
              <p className="mt-2 font-body text-[13px] text-ink-soft">
                &ldquo;{fields.title || "Untitled session"}&rdquo; and its notes, comments, and
                change history will be permanently deleted. This can&rsquo;t be undone.
              </p>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="rounded-lg border border-hairline px-4 py-2 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={async () => {
                    if (!localSessionId) return;
                    setDeleting(true);
                    try {
                      await deleteSession(campaignId, localSessionId);
                      router.push(journal.campaign(campaignId));
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-wine px-4 py-2 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-60"
                >
                  <Trash2 size={13} /> {deleting ? "Deleting…" : "Delete session"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </main>
  );
}

/**
 * Which campaign players were at the table — toggleable chips instead of
 * freehand text. Selection is stored as a markdown bullet list in the same
 * `player_characters` text column, so no schema change is needed.
 */
function PresentPlayersEditor({
  value,
  players,
  onChange,
}: {
  value: string;
  players: EditPlayer[];
  onChange: (markdown: string) => void;
}) {
  const selected = new Set(
    players.filter((p) => value.includes(p.characterName)).map((p) => p.userId),
  );

  function toggle(userId: string) {
    const next = new Set(selected);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    onChange(players.filter((p) => next.has(p.userId)).map((p) => `- ${p.characterName}`).join("\n"));
  }

  if (players.length === 0) {
    return <p className="font-body text-[13px] italic text-muted">No players in this campaign yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2 py-1">
      {players.map((p) => {
        const active = selected.has(p.userId);
        return (
          <button
            key={p.userId}
            type="button"
            onClick={() => toggle(p.userId)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-body text-[13px] transition ${
              active ? "border-gold bg-cod-soft text-ink" : "border-hairline text-ink-soft hover:border-gold"
            }`}
          >
            {active && <Check size={12} className="text-gold" />}
            {p.characterName}
            {p.isDm ? " (DM)" : ""}
          </button>
        );
      })}
    </div>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-cod-soft px-5 py-[18px]">
      <span className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

/** A session can hold more than one image; exactly one is "the session
 *  image" (shown at the hero/highest level) — the gold-ringed thumbnail. */
function SessionImageGallery({
  images,
  coverUrl,
  disabled,
  onUpload,
  onSetCover,
  onRemove,
}: {
  images: EditSessionImage[];
  coverUrl: string | null;
  disabled: boolean;
  onUpload: (file: File) => void | Promise<void>;
  onSetCover: (url: string) => void | Promise<void>;
  onRemove: (image: EditSessionImage) => void | Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        {images.map((img) => {
          const isCover = img.url === coverUrl;
          return (
            <div
              key={img.id}
              className={`group relative aspect-square overflow-hidden rounded-lg ${isCover ? "ring-2 ring-gold" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              {isCover && (
                <span className="absolute bottom-1 left-1 rounded bg-gold px-1.5 py-0.5 font-display text-[8px] font-semibold uppercase tracking-wide text-white">
                  Session image
                </span>
              )}
              <div className="absolute inset-0 hidden items-start justify-end gap-1 bg-black/35 p-1 group-hover:flex">
                {!isCover && (
                  <button
                    type="button"
                    aria-label="Set as session image"
                    onClick={() => onSetCover(img.url)}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-surface text-gold"
                  >
                    <Check size={11} />
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => onRemove(img)}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-surface text-wine"
                >
                  <X size={11} />
                </button>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          disabled={disabled || uploading}
          onClick={async () => {
            const file = await pickImageFile();
            if (!file) return;
            setUploading(true);
            try {
              await onUpload(file);
            } finally {
              setUploading(false);
            }
          }}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg text-muted disabled:opacity-50"
          style={{ border: "1.5px dashed var(--hairline)" }}
        >
          <ImagePlus size={16} />
          <span className="font-body text-[10px] italic">{uploading ? "Uploading…" : "Add"}</span>
        </button>
      </div>
      {disabled && (
        <p className="font-body text-[11px] italic text-muted">Save the session first.</p>
      )}
    </div>
  );
}
