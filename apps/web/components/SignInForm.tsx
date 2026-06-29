"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import Link from "next/link";
import { getBrowserSupabase } from "@vestige/db/client";

export function SignInForm({ next }: { next: string }) {
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
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
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
      <div className="flex items-center gap-3">
        <span className="h-6 w-0.5 bg-gold" />
        <h1 className="font-display text-[22px] font-semibold tracking-[0.04em] text-ink">
          WELCOME BACK
        </h1>
      </div>
      <p className="-mt-2 font-body text-[13px] italic text-muted">
        Sign in with a magic link — no password to remember.
      </p>

      <label className="flex flex-col gap-1.5">
        <span className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
          EMAIL ADDRESS
        </span>
        <input
          type="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10 border-b border-hairline bg-transparent font-body text-ink outline-none transition focus:border-gold"
        />
      </label>

      {error && <p className="font-body text-sm text-vote-no">{error}</p>}

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
        {status === "sending" ? "Sending…" : "Send magic link"}
      </button>

      <p className="text-center font-body text-xs text-ink-soft">
        New here?{" "}
        <Link href="/signup" className="text-wine underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
