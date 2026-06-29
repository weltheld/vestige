"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { Avatar } from "./Avatar";
import { ImageCropper } from "./ImageCropper";
import { TextField } from "./TextField";
import { WaxButton } from "./WaxButton";
import { updateProfileAction, uploadAvatarAction } from "@/app/profile/actions";

type Initial = {
  character_name: string;
  display_name: string;
  avatar_url: string | null;
};

/**
 * Shared profile editor (portrait upload + names). Used both for first-time
 * onboarding (navigates onward) and the in-app edit dialog (closes on save).
 */
export function ProfileEditor({
  initial,
  mode,
  onClose,
}: {
  initial: Initial;
  mode: "onboarding" | "dialog";
  onClose?: () => void;
}) {
  const router = useRouter();
  const [character, setCharacter] = useState(initial.character_name);
  const [display, setDisplay] = useState(initial.display_name);
  const [avatar, setAvatar] = useState<string | null>(initial.avatar_url);
  const [showError, setShowError] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setServerError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setServerError("Image must be 5 MB or smaller.");
      return;
    }
    setServerError(null);
    setCropFile(file);
  }

  async function uploadCropped(blob: Blob) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "avatar.jpg");
      const result = await uploadAvatarAction(fd);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      setAvatar(result.url);
      setCropFile(null);
    } finally {
      setUploading(false);
    }
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!character.trim() || !display.trim()) {
      setShowError(true);
      return;
    }
    startTransition(async () => {
      const result = await updateProfileAction({
        character_name: character,
        display_name: display,
        avatar_url: avatar,
      });
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      if (mode === "dialog") {
        onClose?.();
        router.refresh();
      } else {
        router.push(result.nextHref);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSave} className="space-y-5">
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

      <div className="flex flex-col items-center gap-3">
        <Avatar src={avatar ?? undefined} alt={character || "Adventurer"} size={96} ring="gold" />
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickPhoto}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface/60 px-3 py-1.5 text-xs font-display tracking-wider uppercase text-ink hover:bg-parchment disabled:opacity-50"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          {uploading ? "Uploading..." : "Upload a photo"}
        </button>
      </div>

      <TextField
        label="Character name"
        placeholder="Alaric the Gray"
        value={character}
        onChange={(e) => setCharacter(e.target.value)}
        error={
          showError && !character.trim()
            ? "A character name is required to take a seat at the table."
            : undefined
        }
      />
      <TextField
        label="Your name"
        placeholder="Felix Hoge"
        value={display}
        onChange={(e) => setDisplay(e.target.value)}
        error={
          showError && !display.trim()
            ? "Your name is required so the party can address you."
            : undefined
        }
      />

      {serverError && (
        <p className="rounded-md border border-vote-no/40 bg-vote-no/10 px-3 py-2 text-xs text-vote-no">
          {serverError}
        </p>
      )}

      <WaxButton type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </WaxButton>
    </form>
  );
}
