"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, X } from "lucide-react";
import { getBrowserSupabase } from "@vestige/db/client";
import { PlatformCrest } from "./PlatformCrest";

/**
 * The platform "Edit profile" overlay — a layer above the current page
 * (blurred backdrop + centered card + close-X), matching Calendar's own
 * ProfileDialog so the experience is identical in every app. Self-contained:
 * fetches the signed-in user's profile and saves it directly via the browser
 * Supabase client (profiles.update is self-scoped by RLS; the avatars bucket
 * allows writes under the user's own {uid}/ folder), so web and journal need
 * no server actions of their own.
 */
export function ProfileEditDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the current profile each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const supabase = getBrowserSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setError("You must be signed in.");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("first_name, display_name, avatar_url, email")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setEmail(data?.email ?? user.email ?? "");
      setFirstName(data?.first_name ?? "");
      setDisplayName(data?.display_name ?? "");
      setAvatarUrl(data?.avatar_url ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
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
    setUploading(true);
    try {
      const supabase = getBrowserSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in.");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!displayName.trim()) {
      setError("Your name is required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const supabase = getBrowserSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in.");
      const { error: updErr } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          first_name: firstName.trim() || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (updErr) throw updErr;
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <button
        aria-label="Close"
        className="fixed inset-0 bg-[color-mix(in_srgb,var(--ink)_50%,transparent)] backdrop-blur-sm"
        onClick={() => !saving && onClose()}
      />
      <div className="relative w-full max-w-[480px] rounded-xl border border-hairline bg-surface p-8 shadow-[0_8px_32px_-8px_rgba(43,33,24,0.35)] sm:p-10">
        <button
          type="button"
          onClick={() => !saving && onClose()}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md p-1 text-muted transition hover:bg-cod-soft hover:text-ink"
        >
          <X className="h-5 w-5" />
        </button>

        <header className="flex flex-col items-center gap-1 text-center">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
            Vestige
          </p>
          <h1 className="font-display text-2xl text-ink">Your profile</h1>
          {email && (
            <p className="font-body text-xs text-muted">
              Signed in as <span className="font-display text-ink">{email}</span>
            </p>
          )}
        </header>

        {loading ? (
          <div className="mt-8 flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-5">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <span className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-cod-soft ring-1 ring-hairline">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <PlatformCrest size={40} />
                )}
                {uploading && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </span>
                )}
              </span>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={pickAvatar}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInput.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-3 py-1.5 font-display text-[11px] font-semibold uppercase tracking-wider text-ink-soft transition hover:bg-cod-soft hover:text-ink disabled:opacity-50"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                {uploading ? "Uploading…" : "Upload a photo"}
              </button>
            </div>

            <Field label="Your name" value={displayName} onChange={setDisplayName} placeholder="Felix" />
            <Field
              label="First name (used in greetings)"
              value={firstName}
              onChange={setFirstName}
              placeholder="Felix"
            />

            {error && <p className="font-body text-[12px] text-vote-no">{error}</p>}

            <button
              type="button"
              onClick={save}
              disabled={saving || uploading}
              className="mt-1 h-11 rounded-lg bg-wine font-display text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-md border border-hairline bg-[color-mix(in_srgb,var(--surface)_80%,var(--parchment))] px-3 font-body text-ink outline-none transition focus:border-gold"
      />
    </label>
  );
}
