"use client";

import { useRef, useState } from "react";
import { ImagePlus, Mail } from "lucide-react";
import Link from "next/link";
import { getBrowserSupabase } from "@vestige/db/client";
import { ImageCropper } from "@/components/council/ImageCropper";

/** Where a portrait picked at sign-up waits until a session exists to apply
 *  it to — see PendingAvatarUploader, which reads and clears this on first
 *  landing in /app after the account is actually created. A data URL, not a
 *  Blob: sessionStorage only holds strings, and it's a small avatar-sized
 *  image, not a multi-MB upload. */
const PENDING_AVATAR_KEY = "vestige-pending-avatar";

export function SignUpForm({ next }: { next: string }) {
  const [firstName, setFirstName] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending">("idle");
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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

  function onCropConfirm(blob: Blob) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      try {
        sessionStorage.setItem(PENDING_AVATAR_KEY, dataUrl);
      } catch {
        // Private mode or a full quota — the portrait just won't carry
        // through to sign-in. Not worth failing sign-up over.
      }
      setAvatarPreview(dataUrl);
    };
    reader.readAsDataURL(blob);
    setCropFile(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    setStatus("sending");

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: signErr } = await getBrowserSupabase().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true,
        // Captured into user_metadata; copied onto the profile after the
        // M7 migration adds profiles.first_name (see docs/supabase-migration.md).
        data: {
          first_name: firstName.trim() || null,
          character_name: characterName.trim() || null,
          // Redeemed the moment the account's session actually exists —
          // see /auth/callback/route.ts. Can't be redeemed here: signing
          // up with a magic link means there's no session yet to attach
          // a campaign membership to.
          join_code: joinCode.trim().toUpperCase() || null,
        },
      },
    });

    if (signErr) {
      setStatus("idle");
      setError(signErr.message);
      return;
    }
    window.location.assign(`/signin/sent?email=${encodeURIComponent(email)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <span className="h-6 w-0.5 bg-gold" />
        <h1 className="font-display text-[22px] font-semibold tracking-[0.04em] text-ink">
          OPEN YOUR ACCOUNT
        </h1>
      </div>
      <p className="-mt-2 font-body text-[13px] italic text-muted">
        One account for Calendar and Journal. We&rsquo;ll have you in your
        campaign in a minute.
      </p>

      {/* Avatar uploader. There's no account (and so no storage path to
          upload to) until the magic link is redeemed, so this crops and
          holds the image locally — see PendingAvatarUploader, which applies
          it the moment a session actually exists. */}
      {cropFile && (
        <ImageCropper
          file={cropFile}
          round
          aspect={1}
          viewWidth={256}
          outputWidth={512}
          title="Position your portrait"
          onCancel={() => setCropFile(null)}
          onConfirm={onCropConfirm}
        />
      )}
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
        title="Add a portrait"
        className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-full border-[1.5px] border-gold bg-cod-soft text-muted transition hover:brightness-95"
      >
        {avatarPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
        ) : (
          <>
            <ImagePlus size={22} />
            <span className="font-body text-[11px] italic">Add portrait</span>
          </>
        )}
      </button>

      {/* Fields */}
      <div className="flex flex-col gap-[18px]">
        <Field label="FIRST NAME" value={firstName} onChange={setFirstName} autoFocus />
        <Field
          label="CHARACTER NAME"
          value={characterName}
          onChange={setCharacterName}
          help="How others see you in sessions. Changeable any time, per campaign."
        />
        <Field label="EMAIL ADDRESS" value={email} onChange={setEmail} type="email" />
        <Field
          label="JOIN CODE (OPTIONAL)"
          value={joinCode}
          onChange={(v) => setJoinCode(v.toUpperCase())}
          help="Got a code from a DM? Enter it here to join their campaign as soon as your account is ready."
        />
      </div>

      {error && <p className="font-body text-sm text-vote-no">{error}</p>}

      {/* Magic-link info bar */}
      <div className="flex items-center gap-3 rounded-[10px] bg-cod-soft px-3.5 py-3">
        <Mail size={14} className="shrink-0 text-gold" />
        <p className="font-body text-xs text-ink-soft">
          No password — we&rsquo;ll send a log-in link to your inbox.
        </p>
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="flex h-11 items-center justify-center rounded-lg bg-wine font-display text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Create account"}
      </button>

      <p className="text-center font-body text-xs text-ink-soft">
        Already have an account?{" "}
        {/* ml-1, not just the space above: this font's own space glyph is
            only ~2px wide at this size, too narrow to read as a gap. */}
        <Link
          href="/signin"
          className="ml-1 text-wine underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  help,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  help?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 border-b border-hairline bg-transparent font-body text-ink outline-none transition focus:border-gold"
      />
      {help && <span className="font-body text-[11px] text-muted">{help}</span>}
    </label>
  );
}
