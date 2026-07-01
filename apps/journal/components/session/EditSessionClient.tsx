"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { DayPicker } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { Pencil, ChevronDown, ImagePlus, Info, X, Check, CalendarDays } from "lucide-react";
import { NOTE_SECTIONS } from "@/lib/notes";
import { journal } from "@/lib/links";
import {
  createSession,
  saveSession,
  addCharacter,
  removeCharacter,
  type SessionInput,
} from "@/app/c/[campaignId]/s/actions";
import { SectionEditor } from "./SectionEditor";
import { pickImageFile, uploadJournalImage } from "@/lib/upload";

type EditCharacter = { id: string; name: string; role: "PC" | "NPC" };

type EditPlayer = { userId: string; characterName: string; isDm: boolean };

type Props = {
  campaignId: string;
  sessionId: string | null;
  initial: SessionInput;
  characters: EditCharacter[];
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
              style={{ border: "1.5px dashed var(--gold)", background: "#faf5e6" }}
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
                <span className={`flex h-[30px] w-[30px] items-center justify-center rounded-full bg-wine font-display text-[12px] text-parchment ${c.role === "PC" ? "ring-2 ring-gold" : ""}`}>
                  {c.name.charAt(0)}
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
              onAdd={async (name, role) => {
                if (!localSessionId) return;
                await addCharacter(campaignId, localSessionId, name, role);
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
    <div className="flex flex-col gap-3 rounded-xl bg-[#faf5e6] px-5 py-[18px]">
      <span className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

function CharacterComposer({
  disabled,
  players,
  onAdd,
}: {
  disabled: boolean;
  players: EditPlayer[];
  onAdd: (name: string, role: "PC" | "NPC") => void;
}) {
  const [playerChoice, setPlayerChoice] = useState("");
  const [npcName, setNpcName] = useState("");
  const [role, setRole] = useState<"PC" | "NPC">("PC");

  const submitNpc = () => {
    if (!npcName.trim()) return;
    onAdd(npcName.trim(), "NPC");
    setNpcName("");
  };

  return (
    <div className="flex items-center gap-2.5 py-1">
      <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-dashed border-gold text-gold">+</span>
      <div className="flex flex-1 flex-col gap-1.5">
        {role === "PC" ? (
          <select
            value={playerChoice}
            disabled={disabled || players.length === 0}
            onChange={(e) => {
              const characterName = e.target.value;
              setPlayerChoice("");
              if (characterName) onAdd(characterName, "PC");
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
          </select>
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
