"use client";

import { useState } from "react";
import { ImagePlus, Mail } from "lucide-react";
import Link from "next/link";
import { getBrowserSupabase } from "@vestige/db/client";

export function SignUpForm({ next }: { next: string }) {
  const [firstName, setFirstName] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending">("idle");
  const [error, setError] = useState<string | null>(null);

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

      {/* Avatar uploader (portrait upload happens after sign-in) */}
      <button
        type="button"
        title="You can add a portrait once you're signed in"
        className="flex h-20 w-20 cursor-default flex-col items-center justify-center gap-1 rounded-full border-[1.5px] border-gold bg-cod-soft text-muted"
      >
        <ImagePlus size={22} />
        <span className="font-body text-[11px] italic">Add portrait</span>
      </button>

      {/* Fields */}
      <div className="flex flex-col gap-[18px]">
        <Field label="FIRST NAME" value={firstName} onChange={setFirstName} autoFocus />
        <Field
          label="CHARACTER NAME"
          value={characterName}
          onChange={setCharacterName}
          help="How others see you in sessions."
        />
        <Field label="EMAIL ADDRESS" value={email} onChange={setEmail} type="email" />
      </div>

      {error && <p className="font-body text-sm text-vote-no">{error}</p>}

      {/* Magic-link info bar */}
      <div className="flex items-center gap-3 rounded-[10px] bg-cod-soft px-3.5 py-3">
        <Mail size={14} className="shrink-0 text-gold" />
        <p className="font-body text-xs text-ink-soft">
          No password — we&rsquo;ll send a sign-in link to your inbox.
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
        <Link href="/signin" className="text-wine underline-offset-4 hover:underline">
          Sign in
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
