"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";
import { importFoundryCharacter } from "@/app/characters/c/[campaignId]/actions";
import { characters } from "@/lib/journal/links";

type State =
  | { step: "idle" }
  | { step: "reading" }
  | { step: "error"; message: string }
  | { step: "done"; message: string };

/**
 * Upload a Foundry actor export.
 *
 * The file is read in the browser and its text sent to the action, so a file
 * that isn't JSON fails with our own message rather than a redacted
 * server-action error. Every rejection says what to do next — a bare "import
 * failed" sends people back to Foundry to re-export a file that was fine.
 */
export function ImportCharacterButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ step: "idle" });

  async function onFile(file: File | undefined) {
    if (!file) return;
    setState({ step: "reading" });

    let text: string;
    try {
      text = await file.text();
    } catch {
      setState({ step: "error", message: "That file couldn't be read. Try exporting it again." });
      return;
    }

    const res = await importFoundryCharacter(campaignId, text);
    // Let the same file be picked again — without this, re-uploading after a
    // fix silently does nothing because the input's value hasn't changed.
    if (input.current) input.current.value = "";

    if (!res.ok) {
      setState({ step: "error", message: res.error });
      return;
    }
    setState({
      step: "done",
      message: res.replaced ? `Updated ${res.name}.` : `Imported ${res.name}.`,
    });
    router.push(characters.sheet(campaignId, res.sheetId));
    router.refresh();
  }

  const busy = state.step === "reading";

  return (
    <div className="flex flex-col items-end gap-1.5">
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="inline-flex items-center gap-2 rounded-lg bg-wine px-[22px] py-3 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {busy ? "Importing…" : "Import character"}
      </button>

      {state.step === "error" && (
        <p className="max-w-[420px] text-right font-body text-[12px] text-vote-no">
          {state.message}
        </p>
      )}
      {state.step === "done" && (
        <p className="font-body text-[12px] text-muted">{state.message}</p>
      )}
    </div>
  );
}
