"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@vestige/db/client";

const COOLDOWN = 30;

export function ResendLink({ email, next }: { email: string; next: string }) {
  const [cooldown, setCooldown] = useState(0);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!email) {
    return (
      <a href="/signin" className="font-body text-xs text-ink-soft underline-offset-4 hover:underline">
        Back to sign in
      </a>
    );
  }

  async function resend() {
    setState("sending");
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await getBrowserSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    if (error) {
      setState("error");
      return;
    }
    setState("sent");
    setCooldown(COOLDOWN);
  }

  if (cooldown > 0) {
    return (
      <span className="font-body text-xs text-muted">
        Link sent — you can resend in {cooldown}s
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={resend}
      disabled={state === "sending"}
      className="font-body text-xs text-ink-soft underline-offset-4 hover:underline disabled:opacity-60"
    >
      {state === "sending"
        ? "Sending…"
        : state === "error"
          ? "Couldn’t resend — try again"
          : "Resend the link"}
    </button>
  );
}
