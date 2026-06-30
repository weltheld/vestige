"use client";

import { useEffect, useRef, useState } from "react";
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

type EditCharacter = { id: string; name: string; role: "PC" | "NPC" };

type Props = {
  campaignId: string;
  sessionId: string | null;
  initial: SessionInput;
  characters: EditCharacter[];
  chroniclerName: string;
  modulesCalendar: boolean;
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
}: Props) {
  const router = useRouter();
  const [fields, setFields] = useState<SessionInput>(initial);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [savedAgo, setSavedAgo] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const firstRender = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = (patch: Partial<SessionInput>) => setFields((f) => ({ ...f, ...patch }));

  // Autosave (existing sessions only): debounced 3s draft persist.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!sessionId) return;
    if (timer.current) clearTimeout(timer.current);
    setSaveState("saving");
    timer.current = setTimeout(async () => {
      await saveSession(campaignId, sessionId, fields, false);
      setSaveState("saved");
      setSavedAgo("just now");
    }, 3000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [fields, sessionId, campaignId]);

  async function handleSave() {
    setSaveState("saving");
    if (sessionId) {
      await saveSession(campaignId, sessionId, fields, true);
      setSaveState("saved");
      setSavedAgo("just now");
      router.push(journal.session(campaignId, sessionId));
    } else {
      const id = await createSession(campaignId, fields);
      router.push(journal.session(campaignId, id));
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-12 pb-24 pt-6">
      {/* Hero edit dressing */}
      <section className="relative h-[220px] w-full overflow-hidden rounded-xl bg-ink">
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.69))" }} />
        <button
          type="button"
          className="absolute right-4 top-4 flex items-center gap-2 rounded-lg border border-white/50 bg-white/20 px-3.5 py-2 font-display text-[10px] uppercase tracking-[0.08em] text-white"
        >
          <ImagePlus size={12} /> Change image
        </button>
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center gap-2">
            <input
              value={fields.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="NEW SESSION TITLE"
              className="w-full max-w-[640px] border-b border-dashed border-white/50 bg-transparent font-display text-[28px] italic text-white outline-none placeholder:text-white/60"
            />
            <Pencil size={14} className="shrink-0 text-white" />
          </div>
          <div className="relative mt-2">
            <button
              type="button"
              onClick={() => setDatePickerOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-md border border-white/50 bg-white/15 px-2.5 py-1 font-body text-[13px] text-white"
            >
              {fields.date ? format(parseISO(fields.date), "MMMM d, yyyy") : "Pick a date"}
              <ChevronDown size={10} />
            </button>
            {datePickerOpen && (
              <div className="absolute left-0 top-9 z-20 rounded-xl border border-hairline bg-surface p-2 shadow-lg">
                <DayPicker
                  mode="single"
                  selected={fields.date ? parseISO(fields.date) : undefined}
                  onSelect={(d) => {
                    set({ date: d ? format(d, "yyyy-MM-dd") : null });
                    setDatePickerOpen(false);
                  }}
                />
              </div>
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
                {sessionId && (
                  <button
                    type="button"
                    onClick={async () => {
                      await removeCharacter(campaignId, sessionId, c.id);
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
              disabled={!sessionId}
              onAdd={async (name, role) => {
                if (!sessionId) return;
                await addCharacter(campaignId, sessionId, name, role);
                router.refresh();
              }}
            />
          </Card>

          <Card label="Session Image">
            <div className="flex h-[140px] w-[240px] flex-col items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-gold bg-[#faf5e6]">
              <ImagePlus size={24} className="text-muted" />
              <p className="font-body text-[12px] italic text-muted">Add session image</p>
              <p className="font-body text-[10px] text-muted">Becomes campaign cover if none yet</p>
            </div>
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
                  <button type="button" className="ml-auto font-body text-[11px] italic text-muted underline">
                    Add image to this section
                  </button>
                </div>
                <SectionEditor
                  value={(fields[key] as string | null) ?? ""}
                  onChange={(md) => set({ [key]: md } as Partial<SessionInput>)}
                  placeholder={PLACEHOLDERS[key]!}
                />
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
                  : sessionId
                    ? `Autosaved as draft${savedAgo ? ` · ${savedAgo}` : ""}`
                    : "Not saved yet"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push(sessionId ? journal.session(campaignId, sessionId) : journal.campaign(campaignId))}
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
  onAdd,
}: {
  disabled: boolean;
  onAdd: (name: string, role: "PC" | "NPC") => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<"PC" | "NPC">("PC");
  const submit = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), role);
    setName("");
  };
  return (
    <div className="flex items-center gap-2.5 py-1">
      <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-dashed border-gold text-gold">+</span>
      <div className="flex flex-1 flex-col gap-1.5">
        <input
          value={name}
          disabled={disabled}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={disabled ? "Save the session first" : "Character name…"}
          className="border-b border-hairline bg-transparent py-1 font-body text-[13px] italic text-ink outline-none placeholder:text-muted disabled:opacity-50"
        />
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
