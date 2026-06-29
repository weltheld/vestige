"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, ImagePlus, Loader2, X } from "lucide-react";
import { Avatar } from "./Avatar";
import { Crest } from "./Crest";
import { ImageCropper } from "./ImageCropper";
import { TextField } from "./TextField";
import { WaxButton } from "./WaxButton";
import { cn } from "@/lib/utils";
import {
  deleteUserImageAction,
  listMyImagesAction,
  setCampaignCharacterAction,
  uploadCharacterImageAction,
} from "@/app/g/[slug]/characterActions";

/** id === null marks a seeded image (profile / current) that can't be deleted. */
type GalleryImage = { id: string | null; url: string };

type Props = {
  campaignId: string;
  initialName: string;
  initialImageUrl?: string;
  profileImageUrl?: string;
  onClose: () => void;
  onSaved: (name: string, imageUrl: string | null) => void;
};

export function CharacterDialog({
  campaignId,
  initialName,
  initialImageUrl,
  profileImageUrl,
  onClose,
  onSaved,
}: Props) {
  const [name, setName] = useState(initialName);
  const [selected, setSelected] = useState<string | null>(
    initialImageUrl ?? null,
  );
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loadingLib, setLoadingLib] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Load the library and seed it with the current + profile images so they're
  // always pickable even if they predate the library table.
  useEffect(() => {
    let active = true;
    (async () => {
      const result = await listMyImagesAction();
      if (!active) return;
      const lib: GalleryImage[] = result.ok
        ? result.images.map((i) => ({ id: i.id, url: i.url }))
        : [];
      const seeds: GalleryImage[] = [];
      for (const url of [initialImageUrl, profileImageUrl]) {
        if (url && !lib.some((i) => i.url === url)) {
          seeds.push({ id: null, url });
        }
      }
      setImages([...seeds, ...lib]);
      setLoadingLib(false);
    })();
    return () => {
      active = false;
    };
  }, [initialImageUrl, profileImageUrl]);

  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5 MB or smaller.");
      return;
    }
    setError(null);
    setCropFile(file);
  }

  async function uploadCropped(blob: Blob) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", blob, "character.jpg");
      const result = await uploadCharacterImageAction(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setImages((prev) => [
        { id: result.image.id, url: result.image.url },
        ...prev,
      ]);
      setSelected(result.image.url);
      setCropFile(null);
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(img: GalleryImage) {
    if (!img.id) return; // seeded entries aren't owned library rows
    setImages((prev) => prev.filter((i) => i.url !== img.url));
    if (selected === img.url) setSelected(null);
    await deleteUserImageAction(img.id);
  }

  async function save() {
    if (!name.trim()) {
      setError("A character name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await setCampaignCharacterAction(campaignId, {
      characterName: name,
      avatarUrl: selected,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSaved(name.trim(), selected);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
      />

      {cropFile && (
        <ImageCropper
          file={cropFile}
          round
          aspect={1}
          viewWidth={256}
          outputWidth={512}
          title="Position your portrait"
          onCancel={() => setCropFile(null)}
          onConfirm={uploadCropped}
        />
      )}

      <div className="relative z-10 max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl border border-hairline bg-parchment p-5 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">
              Your character here
            </h2>
            <p className="text-xs text-ink-soft">
              Choose a name and portrait for this campaign.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-soft hover:bg-parchment hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current selection preview */}
        <div className="mb-4 flex items-center gap-3">
          <Avatar
            src={selected ?? undefined}
            alt={name || "Adventurer"}
            size={64}
            ring="gold"
          />
          <div className="min-w-0">
            <p className="truncate font-display text-base font-bold text-ink">
              {name || "Unnamed adventurer"}
            </p>
            <p className="text-[11px] text-ink-soft">
              {selected ? "Portrait selected" : "No portrait — a crest is shown"}
            </p>
          </div>
        </div>

        <TextField
          label="Character name"
          placeholder="Alaric the Gray"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Gallery */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-display uppercase tracking-wider text-ink-soft">
            Your portraits
          </p>
          {loadingLib ? (
            <div className="flex h-24 items-center justify-center text-ink-soft">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {/* Upload tile */}
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-hairline bg-surface/50 text-ink-soft transition hover:border-dm-gold hover:text-ink disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-[10px] leading-none">Upload</span>
                  </>
                )}
              </button>

              {images.map((img) => {
                const isSelected = selected === img.url;
                return (
                  <div key={img.url} className="group relative aspect-square">
                    <button
                      type="button"
                      onClick={() => setSelected(img.url)}
                      className={cn(
                        "h-full w-full overflow-hidden rounded-lg border bg-surface transition",
                        isSelected
                          ? "border-dm-gold ring-2 ring-dm-gold"
                          : "border-hairline hover:border-ink/40",
                      )}
                    >
                      <Image
                        src={img.url}
                        alt=""
                        width={96}
                        height={96}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    </button>
                    {isSelected && (
                      <span className="pointer-events-none absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-dm-gold text-parchment shadow">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                    {img.id && (
                      <button
                        type="button"
                        onClick={() => removeImage(img)}
                        aria-label="Remove from your portraits"
                        title="Remove from your portraits"
                        className="absolute left-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition hover:bg-vote-no group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {/* "Use a crest instead" clears the portrait */}
          {selected && (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-ink-soft hover:text-ink"
            >
              <Crest size={14} />
              Use a crest instead
            </button>
          )}
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickPhoto}
        />

        {error && (
          <p className="mt-4 rounded-md border border-vote-no/40 bg-vote-no/10 px-3 py-2 text-xs text-vote-no">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <WaxButton variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </WaxButton>
          <WaxButton onClick={save} disabled={saving || uploading}>
            {saving ? "Saving..." : "Save character"}
          </WaxButton>
        </div>
      </div>
    </div>
  );
}
