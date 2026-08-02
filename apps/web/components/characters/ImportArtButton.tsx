"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";
import type { CharacterSheetData } from "@vestige/db";
import { getBrowserSupabase } from "@vestige/db/client";
import { setCharacterArt } from "@/app/characters/c/[campaignId]/actions";
import { candidatePaths, collectImagePaths, isImage, matchFiles, storageKey } from "@/lib/characters/art";

const BUCKET = "character-art";

type State =
  | { step: "idle" }
  | { step: "working"; done: number; total: number }
  | { step: "error"; message: string }
  | { step: "done"; message: string };

/**
 * Copy the sheet's artwork out of the player's Foundry install.
 *
 * A Foundry export names images by path and carries no bytes, so the pictures
 * have to come from the folder the export was made from. The browser can't go
 * looking, but it can read a directory the user deliberately picks — so this
 * asks for the Foundry Data folder, takes only the files this sheet actually
 * references, and copies those into storage.
 *
 * Copied rather than linked: a link into a running Foundry works for one
 * person, while that machine is awake. A copy works for the whole table.
 */
export function ImportArtButton({
  campaignId,
  sheetId,
  sheet,
}: {
  campaignId: string;
  sheetId: string;
  sheet: CharacterSheetData;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ step: "idle" });

  const wanted = collectImagePaths(sheet);
  const already = Object.keys(sheet.art ?? {}).length;
  // Nothing to fetch: an export whose every image is already a URL, or a
  // sheet that's been through this step.
  if (wanted.length === 0) return null;

  /**
   * Resolve the wanted paths by walking straight to them.
   *
   * The old approach — <input webkitdirectory> — made the browser enumerate the
   * entire folder first, which is where "upload 32,000 files?" came from: the
   * prompt happens before any filter of ours can run. But the export already
   * names every file we want, so there is no need to look at the folder at all:
   * with a directory handle we can descend to each path directly and read only
   * those. No enumeration, no prompt, and nothing else is ever opened.
   */
  async function pickDirectory() {
    const picker = (
      window as Window & {
        showDirectoryPicker?: (o?: { mode?: string; id?: string }) => Promise<FileSystemDirectoryHandle>;
      }
    ).showDirectoryPicker;
    if (!picker) {
      // Firefox and Safari have no directory handles; fall back to the input,
      // which works but asks the scary question.
      input.current?.click();
      return;
    }

    let root: FileSystemDirectoryHandle;
    try {
      root = await picker({ mode: "read", id: "foundry-art" });
    } catch {
      return; // dismissed the picker
    }

    setState({ step: "working", done: 0, total: wanted.length });
    const found = new Map<string, File>();
    const missing: string[] = [];

    for (const want of wanted) {
      const file = await resolve(root, want);
      if (file) found.set(want, file);
      else missing.push(want);
      setState({ step: "working", done: found.size + missing.length, total: wanted.length });
    }

    if (found.size === 0) {
      setState({
        step: "error",
        message:
          "None of this sheet's images were under that folder. Stock icons (icons/…) ship with the Foundry application — try the Foundry install folder. Your own art lives in the FoundryVTT Data folder.",
      });
      return;
    }
    await upload(found, missing);
  }

  /** Descend to one path, trying each plausible root. Missing folders throw,
   *  which is the normal case here rather than an error. */
  async function resolve(
    root: FileSystemDirectoryHandle,
    foundryPath: string,
  ): Promise<File | null> {
    for (const candidate of candidatePaths(foundryPath)) {
      const parts = candidate.split("/").filter(Boolean);
      const fileName = parts.pop();
      if (!fileName) continue;
      try {
        let dir = root;
        for (const part of parts) dir = await dir.getDirectoryHandle(part);
        const handle = await dir.getFileHandle(fileName);
        return await handle.getFile();
      } catch {
        /* not under this root — try the next */
      }
    }
    return null;
  }

  async function onPick(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    // Only images, and only the ones this sheet mentions — a Foundry folder is
    // tens of thousands of files and we want a few dozen.
    const files = Array.from(fileList)
      .filter((f) => isImage(f.name))
      .map((f) => ({
        name: f.name,
        // webkitRelativePath is the path within the picked folder.
        relativePath: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
        file: f,
      }));

    const { matched, missing } = matchFiles(wanted, files);
    if (input.current) input.current.value = "";
    if (matched.size === 0) {
      setState({
        step: "error",
        message:
          "None of this sheet's images were in that folder. Stock icons (icons/…) ship with the Foundry application; your own art is in the FoundryVTT Data folder.",
      });
      return;
    }
    await upload(new Map([...matched].map(([k, v]) => [k, v.file])), missing);
  }

  /** Copy the resolved files into storage and record where they went. */
  async function upload(found: Map<string, File>, missing: string[]) {
    const supabase = getBrowserSupabase();
    const art: Record<string, string> = {};
    let done = 0;
    setState({ step: "working", done: 0, total: found.size });

    for (const [foundryPath, file] of found) {
      const entry = { file };
      const key = await storageKey(campaignId, foundryPath);
      // upsert: the same icon across two characters resolves to one object,
      // and re-running the step overwrites rather than erroring.
      const { error } = await supabase.storage.from(BUCKET).upload(key, entry.file, {
        upsert: true,
        contentType: entry.file.type || undefined,
        cacheControl: "31536000",
      });
      if (error) {
        setState({ step: "error", message: `Upload failed: ${error.message}` });
        return;
      }
      art[foundryPath] = supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
      done++;
      setState({ step: "working", done, total: found.size });
    }

    const res = await setCharacterArt(campaignId, sheetId, art);
    if (!res.ok) {
      setState({ step: "error", message: res.error });
      return;
    }
    setState({
      step: "done",
      // Missing files are reported, not hidden: a module's icons living
      // somewhere else is the normal reason, and the user can run the step
      // again pointing at that folder.
      message:
        `Added ${found.size} image${found.size === 1 ? "" : "s"}.` +
        (missing.length
          ? ` ${missing.length} not found there — run it again on your other Foundry folder.`
          : ""),
    });
    router.refresh();
  }

  const busy = state.step === "working";

  return (
    <div className="flex flex-col items-start gap-1.5">
      <input
        ref={input}
        type="file"
        // Directory picking. Not in the React types, hence the cast — it's
        // supported in Chrome, Edge and Safari.
        {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
        multiple
        className="hidden"
        onChange={(e) => void onPick(e.target.files)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => void pickDirectory()}
        title="Copy this sheet's images out of your Foundry data folder"
        className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-surface px-4 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft transition hover:border-gold hover:text-ink disabled:opacity-60"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
        {busy
          ? `Copying ${state.done}/${state.total}…`
          : already > 0
            ? "Update artwork"
            : "Add artwork"}
      </button>

      {state.step === "error" && (
        <p className="max-w-[420px] font-body text-[12px] text-vote-no">{state.message}</p>
      )}
      {state.step === "done" && (
        <p className="font-body text-[12px] text-muted">{state.message}</p>
      )}
      {state.step === "idle" && (
        <p className="max-w-[420px] font-body text-[11px] text-muted">
          {already > 0
            ? `${already} of ${wanted.length} images copied.`
            : `Pick your Foundry Data folder to copy this sheet's ${wanted.length} images.`}
        </p>
      )}
    </div>
  );
}
