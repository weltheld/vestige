"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { DayPicker } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { Pencil, ChevronDown, ImagePlus, Info, X, Check, CalendarDays, Trash2 } from "lucide-react";
import { NOTE_SECTIONS } from "@/lib/notes";
import { journal } from "@/lib/links";
import {
  createSession,
  saveSession,
  addCharacter,
  removeCharacter,
  deleteSession,
  addSessionImage,
  removeSessionImage,
  setSessionCoverImage,
  type SessionInput,
} from "@/app/c/[campaignId]/s/actions";
import { SectionEditor } from "./SectionEditor";
import { pickImageFile, uploadJournalImage } from "@/lib/upload";

type EditCharacter = { id: string; name: string; role: "PC" | "NPC"; portraitUrl: string | null };

type EditPlayer = { userId: string; characterName: string; avatarUrl: string | null; isDm: boolean };

type EditSessionImage = { id: string; url: string };

type Props = {
  campaignId: string;
  sessionId: string | null;
  initial: SessionInput;
  characters: EditCharacter[];
  images: EditSessionImage[];
  chroniclerName: string;
  modulesCalendar: boolean;
  players: EditPlayer[];
};

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
  characters,
  images,
  chroniclerName,
  modulesCalendar,
  players,
}: Props) {
  const router = useRouter();
  const [fields, setFields] = useState<SessionInput>(initial);
  const [localSessionId, setLocalSessionId] = useState(sessionId);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [savedAgo, setSavedAgo] = useState<string | null>(null);
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
    setSaveState("saving");
    timer.current = setTimeout(async () => {
      if (!localSessionId) {
        if (creating.current || !fields.title.trim()) {
          setSaveState("idle");
          return;
        }
        creating.current = true;
        const id = await createSession(campaignId, fields);
        // A cover chosen before the session existed isn't in the gallery
        // yet (that table needs a real session id) — backfill it now.
        if (fields.image_url) await addSessionImage(campaignId, id, fields.image_url);
        creating.current = false;
        lastRevisionAt.current = Date.now();
        setLocalSessionId(id);
        setSaveState("saved");
        setSavedAgo("just now");
        router.replace(journal.editSession(campaignId, id));
        return;
      }
      const recordRevision = Date.now() - lastRevisionAt.current > 60_000;
      await saveSession(campaignId, localSessionId, fields, recordRevision);
      if (recordRevision) lastRevisionAt.current = Date.now();
      setSaveState("saved");
      setSavedAgo("just now");
    }, 3000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [fields, localSessionId, campaignId, router]);

  async function handleSave() {
    setSaveState("saving");
    if (localSessionId) {
      await saveSession(campaignId, localSessionId, fields, true);
      lastRevisionAt.current = Date.now();
      setSaveState("saved");
      setSavedAgo("just now");
      router.push(journal.session(campaignId, localSessionId));
    } else {
      const id = await createSession(campaignId, fields);
      if (fields.image_url) await addSessionImage(campaignId, id, fields.image_url);
      lastRevisionAt.current = Date.now();
      router.push(journal.session(campaignId, id));
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-12 pb-24 pt-6">
      {/* Hero edit dressing — a 4:3 thumbnail (fully visible, not cropped
          into an ultra-wide banner) beside the title/date fields. */}
      <section className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <button
          type="button"
          disabled={uploadingCover}
          onClick={async () => {
            const file = await pickImageFile();
            if (!file) return;
            setUploadingCover(true);
            try {
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

      <div className="flex items-start gap-8">
        {/* Sidebar */}
        <aside className="flex w-[280px] shrink-0 flex-col gap-4">
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
          </Card>

          <Card label="In This Session">
            {characters.map((c) => (
              <div key={c.id} className="group flex items-center gap-2.5 py-1">
                <span
                  className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-wine font-display text-[12px] text-parchment ${c.role === "PC" ? "ring-2 ring-gold" : ""}`}
                >
                  {c.portraitUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.portraitUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    c.name.charAt(0)
                  )}
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="font-display text-[13px] text-ink">{c.name}</span>
                  <span className="font-body text-[10px] italic text-muted">{c.role}</span>
                </span>
                {localSessionId && (
                  <button
                    type="button"
                    onClick={async () => {
                      await removeCharacter(campaignId, localSessionId, c.id);
                      router.refresh();
                    }}
                    className="text-muted opacity-0 transition group-hover:opacity-100"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            <div className="h-px bg-hairline" />
            <CharacterComposer
              disabled={!localSessionId}
              players={players.filter((p) => !characters.some((c) => c.name === p.characterName))}
              onAdd={async (name, role, avatarUrl) => {
                if (!localSessionId) return;
                await addCharacter(campaignId, localSessionId, name, role, avatarUrl ?? null);
                router.refresh();
              }}
            />
          </Card>

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
                  {key !== "player_characters" && (
                    <button type="button" className="ml-auto font-body text-[11px] italic text-muted underline">
                      Add image to this section
                    </button>
                  )}
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
                  />
                )}
              </section>
            ))}
          </div>

          {/* Save bar */}
          <div className="mt-10 flex max-w-[640px] items-center justify-between border-t border-hairline py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-soft" />
                <span className="font-body text-[12px] italic text-muted">
                  {saveState === "saving"
                    ? "Saving…"
                    : localSessionId
                      ? `Autosaved as draft${savedAgo ? ` · ${savedAgo}` : ""}`
                      : "Not saved yet"}
                </span>
              </div>
              {localSessionId && (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="flex items-center gap-1.5 font-body text-[11px] text-wine underline decoration-wine/40 underline-offset-2 hover:decoration-wine"
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
                className="flex items-center gap-1.5 rounded-lg bg-wine px-[22px] py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white"
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
              className="fixed inset-0 bg-ink/50 backdrop-blur-sm"
              onClick={() => !deleting && setDeleteConfirmOpen(false)}
            />
            <div className="relative w-full max-w-[380px] rounded-xl border border-hairline bg-surface p-6 shadow-parchment">
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

const GUEST_SENTINEL = "__guest__";

function CharacterComposer({
  disabled,
  players,
  onAdd,
}: {
  disabled: boolean;
  players: EditPlayer[];
  onAdd: (name: string, role: "PC" | "NPC", avatarUrl?: string | null) => void;
}) {
  const [playerChoice, setPlayerChoice] = useState("");
  const [npcName, setNpcName] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestMode, setGuestMode] = useState(false);
  const [role, setRole] = useState<"PC" | "NPC">("PC");

  const submitNpc = () => {
    if (!npcName.trim()) return;
    onAdd(npcName.trim(), "NPC");
    setNpcName("");
  };

  const submitGuest = () => {
    if (!guestName.trim()) return;
    onAdd(guestName.trim(), "PC");
    setGuestName("");
  };

  // With no campaign players left to add (all added already, or none joined
  // yet), fall straight to the guest input — otherwise it'd be stuck behind
  // a disabled select with no way to reach the guest option.
  const effectiveGuestMode = guestMode || players.length === 0;

  return (
    <div className="flex items-center gap-2.5 py-1">
      <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-dashed border-gold text-gold">+</span>
      <div className="flex flex-1 flex-col gap-1.5">
        {role === "PC" ? (
          effectiveGuestMode ? (
            <>
              <input
                value={guestName}
                disabled={disabled}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitGuest()}
                placeholder={disabled ? "Save the session first" : "Guest character's name…"}
                className="border-b border-hairline bg-transparent py-1 font-body text-[13px] italic text-ink outline-none placeholder:text-muted disabled:opacity-50"
              />
              {players.length > 0 && (
                <button
                  type="button"
                  onClick={() => setGuestMode(false)}
                  className="self-start font-body text-[11px] text-ink-soft underline underline-offset-2"
                >
                  ← Choose a campaign player instead
                </button>
              )}
            </>
          ) : (
            <select
              value={playerChoice}
              disabled={disabled || players.length === 0}
              onChange={(e) => {
                const value = e.target.value;
                setPlayerChoice("");
                if (value === GUEST_SENTINEL) setGuestMode(true);
                else if (value) {
                  const player = players.find((p) => p.characterName === value);
                  onAdd(value, "PC", player?.avatarUrl);
                }
              }}
              className="border-b border-hairline bg-transparent py-1 font-body text-[13px] italic text-ink outline-none disabled:opacity-50"
            >
              <option value="" disabled>
                {disabled
                  ? "Save the session first"
                  : players.length === 0
                    ? "No players left to add"
                    : "Choose a player…"}
              </option>
              {players.map((p) => (
                <option key={p.userId} value={p.characterName}>
                  {p.characterName}
                  {p.isDm ? " (DM)" : ""}
                </option>
              ))}
              {!disabled && <option value={GUEST_SENTINEL}>+ Add a guest character…</option>}
            </select>
          )
        ) : (
          <input
            value={npcName}
            disabled={disabled}
            onChange={(e) => setNpcName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitNpc()}
            placeholder={disabled ? "Save the session first" : "NPC name…"}
            className="border-b border-hairline bg-transparent py-1 font-body text-[13px] italic text-ink outline-none placeholder:text-muted disabled:opacity-50"
          />
        )}
        <div className="flex gap-1.5">
          {(["PC", "NPC"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded px-2 py-0.5 font-display text-[10px] font-semibold uppercase ${role === r ? "bg-cod-soft text-wine" : "border border-hairline text-muted"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
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
