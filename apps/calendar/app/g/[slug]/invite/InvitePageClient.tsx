"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { VenetianMask } from "lucide-react";
import { Crest } from "@/components/council/Crest";
import { TextField } from "@/components/council/TextField";
import { WaxButton } from "@/components/council/WaxButton";
import { Avatar } from "@/components/council/Avatar";
import type { BackgroundScene } from "@/lib/types";
import { cn } from "@/lib/utils";
import { withBasePath } from "@/lib/basePath";
import {
  addExistingMemberAction,
  cancelInviteAction,
  resendInviteAction,
  sendInviteAction,
} from "./actions";

type AddableUser = {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
};

type Member = {
  userId: string;
  role: string;
  isDm: boolean;
  displayName: string;
  email: string;
  avatarUrl?: string;
};

type Invitation = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl?: string;
  status: string;
};

export function InvitePageClient({
  slug,
  name,
  background,
  members,
  invitations,
  addableUsers,
}: {
  slug: string;
  name: string;
  background: BackgroundScene;
  members: Member[];
  invitations: Invitation[];
  addableUsers: AddableUser[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const inviteLink = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${withBasePath(`/login?next=/g/${slug}`)}`;
  }, [slug]);

  function onSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await sendInviteAction(slug, email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEmail("");
      setNotice(
        result.emailed
          ? "Magic-link invitation sent."
          : "Already on the platform — invitation queued.",
      );
      router.refresh();
    });
  }

  function onCancel(invitationId: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await cancelInviteAction(slug, invitationId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onAddExisting(userId: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await addExistingMemberAction(slug, userId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice("Player added to the campaign.");
      router.refresh();
    });
  }

  function onResend(invitationId: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await resendInviteAction(slug, invitationId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice("Invitation resent.");
      router.refresh();
    });
  }

  // Show everyone already at the table, DMs included, DMs first.
  const joinedParty = [...members].sort((a, b) =>
    a.isDm === b.isDm ? 0 : a.isDm ? -1 : 1,
  );
  const pendingInvites = invitations.filter((i) => i.status !== "joined");

  return (
    <div
      className={cn(
        "min-h-screen w-full px-4 py-10 sm:px-8",
        `bg-scene-${background}`,
      )}
    >
      <div className="mx-auto w-full max-w-[560px] rounded-xl border border-hairline bg-surface p-8 shadow-parchment sm:p-10">
        <header className="flex flex-col items-center text-center gap-3">
          <Crest size={56} />
          <p className="small-caps">Council of Days</p>
          <h1 className="font-display text-3xl text-ink">Summon your party</h1>
          <p className="font-body text-ink-soft italic">
            {name} awaits its adventurers.
          </p>
        </header>

        <section className="mt-7 space-y-2">
          <p className="small-caps">Magic invite link</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={inviteLink}
              className="flex-1 h-11 px-3 rounded-md border border-hairline bg-surface/80 text-ink font-mono text-sm"
            />
            <WaxButton
              type="button"
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(inviteLink);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </WaxButton>
          </div>
          <p className="text-xs text-ink-soft">
            Anyone with this link can sign in by email and join.
          </p>
        </section>

        <section className="mt-7 space-y-3">
          <p className="small-caps">The party so far</p>
          <ul className="space-y-2">
            {joinedParty.map((m) => (
              <li
                key={m.userId}
                className="flex items-center justify-between rounded-md border border-hairline/60 bg-surface/60 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <Avatar src={m.avatarUrl} alt={m.displayName} size={32} />
                  <span className="text-ink">
                    {m.displayName || m.email}
                  </span>
                </div>
                {m.isDm ? (
                  <span className="inline-flex items-center gap-1 text-xs font-display tracking-wider uppercase text-dm-gold">
                    <VenetianMask className="h-3.5 w-3.5" /> DM
                  </span>
                ) : (
                  <span className="text-xs font-display tracking-wider uppercase text-vote-yes">
                    Joined
                  </span>
                )}
              </li>
            ))}
            {pendingInvites.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between rounded-md border border-hairline/60 bg-surface/40 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={i.avatarUrl}
                    alt={i.displayName ?? i.email}
                    size={32}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-ink">
                      {i.displayName ?? i.email}
                    </p>
                    {i.displayName && (
                      <p className="truncate text-xs text-ink-soft">{i.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-display tracking-wider uppercase text-gold">
                    Pending
                  </span>
                  {!i.displayName && (
                    <button
                      type="button"
                      onClick={() => onResend(i.id)}
                      disabled={pending}
                      className="text-xs text-ink-soft hover:text-ink"
                    >
                      Resend
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onCancel(i.id)}
                    disabled={pending}
                    className="text-xs text-ink-soft hover:text-vote-no"
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ))}
            {joinedParty.length === 0 && pendingInvites.length === 0 && (
              <li className="rounded-md border border-hairline/60 bg-surface/40 px-3 py-3 text-center text-xs text-ink-soft">
                Send the first invitation below to grow the company.
              </li>
            )}
          </ul>
        </section>

        {addableUsers.length > 0 && (
          <section className="mt-7 space-y-3">
            <div>
              <p className="small-caps">Add a player you invited</p>
              <p className="mt-1 text-xs text-ink-soft">
                These people signed up but aren&apos;t in any campaign yet. You
                can only add people you invited.
              </p>
            </div>
            <ul className="space-y-2">
              {addableUsers.map((u) => (
                <li
                  key={u.userId}
                  className="flex items-center justify-between gap-3 rounded-md border border-hairline/60 bg-surface/60 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      src={u.avatarUrl}
                      alt={u.displayName || u.email}
                      size={32}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-ink">
                        {u.displayName || u.email}
                      </p>
                      {u.displayName && (
                        <p className="truncate text-xs text-ink-soft">
                          {u.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <WaxButton
                    type="button"
                    variant="outline"
                    onClick={() => onAddExisting(u.userId)}
                    disabled={pending}
                  >
                    Add
                  </WaxButton>
                </li>
              ))}
            </ul>
          </section>
        )}

        <form onSubmit={onSend} className="mt-6 flex items-end gap-2">
          <div className="flex-1">
            <TextField
              label="Send by email"
              type="email"
              placeholder="adventurer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <WaxButton type="submit" disabled={pending}>
            {pending ? "Sending..." : "Send"}
          </WaxButton>
        </form>

        {error && (
          <p className="mt-3 rounded-md border border-vote-no/40 bg-vote-no/10 px-3 py-2 text-xs text-vote-no">
            {error}
          </p>
        )}
        {notice && !error && (
          <p className="mt-3 rounded-md border border-vote-yes/40 bg-vote-yes/10 px-3 py-2 text-xs text-vote-yes">
            {notice}
          </p>
        )}

        <div className="mt-6 flex justify-end">
          <WaxButton
            variant="outline"
            onClick={() => router.push(`/g/${slug}`)}
          >
            Enter the company &rarr;
          </WaxButton>
        </div>
      </div>
    </div>
  );
}
