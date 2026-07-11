"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { VenetianMask, Copy, Check, X, LogOut } from "lucide-react";
import { PlatformCrest } from "@vestige/ui";
import type { ManageData } from "@/lib/manage";
import {
  sendInvite,
  cancelInvite,
  resendInvite,
  addExistingMember,
  removeMember,
  leaveCampaign,
} from "@/app/app/c/[campaignId]/manage/actions";

/** The platform Manage-campaign content — magic link, party list, people you
 *  can add, and email invites. Rendered inside either the standalone page or
 *  the in-front-of-page overlay; both provide the surrounding card + close. */
export function ManageCampaignScreen({ data, magicLink }: { data: ManageData; magicLink: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, onOk?: () => void) => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      onOk?.();
      router.refresh();
    });
  };

  const leave = () => {
    if (!window.confirm(`Leave “${data.name}”? You'll need a new invite to rejoin.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await leaveCampaign(data.campaignId);
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      // They've lost access — hard-nav back to the platform home.
      window.location.assign("/app");
    });
  };

  // Members (non-creators) get a read-only party list plus a way out.
  if (!data.isCreator) {
    return (
      <div>
        <header className="flex flex-col items-center gap-2 text-center">
          <PlatformCrest size={44} />
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
            Vestige
          </p>
          <h1 className="font-display text-2xl font-bold text-ink">{data.name}</h1>
        </header>

        <section className="mt-7 flex flex-col gap-3">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
            The party
          </p>
          <ul className="flex flex-col gap-2">
            {data.members.map((m) => (
              <li
                key={m.userId}
                className="flex items-center justify-between rounded-md border border-hairline bg-cod-soft px-3 py-2"
              >
                <span className="flex items-center gap-3">
                  <Avatar url={m.avatarUrl} name={m.name} />
                  <span className="font-body text-[14px] text-ink">{m.name}</span>
                </span>
                {m.isDm && (
                  <span className="inline-flex items-center gap-1 font-display text-[11px] uppercase tracking-wider text-gold">
                    <VenetianMask className="h-3.5 w-3.5" /> DM
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <button
          type="button"
          disabled={pending}
          onClick={leave}
          className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-vote-no/40 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-vote-no transition hover:bg-vote-no/10 disabled:opacity-60"
        >
          <LogOut size={14} />
          {pending ? "Leaving…" : "Leave campaign"}
        </button>

        {error && (
          <p className="mt-3 rounded-md border border-vote-no/40 bg-vote-no/10 px-3 py-2 font-body text-[12px] text-vote-no">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <header className="flex flex-col items-center gap-2 text-center">
        <PlatformCrest size={44} />
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
          Vestige
        </p>
        <h1 className="font-display text-2xl font-bold text-ink">Manage campaign</h1>
      </header>

      <section className="mt-7 flex flex-col gap-3">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
          The party so far
        </p>
        <ul className="flex flex-col gap-2">
          {data.members.map((m) => (
            <li
              key={m.userId}
              className="flex items-center justify-between rounded-md border border-hairline bg-cod-soft px-3 py-2"
            >
              <span className="flex items-center gap-3">
                <Avatar url={m.avatarUrl} name={m.name} />
                <span className="font-body text-[14px] text-ink">{m.name}</span>
              </span>
              <span className="flex items-center gap-3">
                {m.isDm ? (
                  <span className="inline-flex items-center gap-1 font-display text-[11px] uppercase tracking-wider text-gold">
                    <VenetianMask className="h-3.5 w-3.5" /> DM
                  </span>
                ) : (
                  <span className="font-display text-[11px] uppercase tracking-wider text-vote-yes">Joined</span>
                )}
                {/* Creator can remove anyone but themselves. */}
                {m.userId !== data.viewerId && (
                  <button
                    type="button"
                    aria-label={`Remove ${m.name}`}
                    disabled={pending}
                    onClick={() => {
                      if (!window.confirm(`Remove ${m.name} from “${data.name}”?`)) return;
                      run(() => removeMember(data.campaignId, m.userId), () => setNotice(`${m.name} removed.`));
                    }}
                    className="rounded p-1 text-muted transition hover:bg-vote-no/10 hover:text-vote-no"
                  >
                    <X size={14} />
                  </button>
                )}
              </span>
            </li>
          ))}
          {data.invitations.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between rounded-md border border-hairline bg-cod-soft/60 px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Avatar url={i.avatarUrl} name={i.name ?? i.email} />
                <span className="min-w-0">
                  <span className="block truncate font-body text-[14px] text-ink">{i.name ?? i.email}</span>
                  {i.name && <span className="block truncate font-body text-[11px] text-muted">{i.email}</span>}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="font-display text-[11px] uppercase tracking-wider text-gold">Pending</span>
                {i.emailInvite && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => resendInvite(data.campaignId, i.id), () => setNotice("Invitation resent."))}
                    className="font-body text-[11px] text-ink-soft hover:text-ink"
                  >
                    Resend
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => cancelInvite(data.campaignId, i.id))}
                  className="font-body text-[11px] text-ink-soft hover:text-vote-no"
                >
                  Cancel
                </button>
              </span>
            </li>
          ))}
          {data.members.length === 0 && data.invitations.length === 0 && (
            <li className="rounded-md border border-hairline bg-cod-soft/60 px-3 py-3 text-center font-body text-[12px] text-muted">
              Send the first invitation below to grow the company.
            </li>
          )}
        </ul>
      </section>

      <section className="mt-7 flex flex-col gap-2">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
          Invite via Magic Link
        </p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={magicLink}
            className="h-11 flex-1 rounded-md border border-hairline bg-[color-mix(in_srgb,var(--surface)_80%,var(--parchment))] px-3 font-mono text-[12px] text-ink"
          />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(magicLink);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
            className="inline-flex h-11 items-center gap-1.5 rounded-md border border-hairline px-4 font-display text-[11px] font-semibold uppercase tracking-wider text-ink-soft transition hover:bg-cod-soft hover:text-ink"
          >
            {copied ? <Check size={14} className="text-vote-yes" /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="font-body text-[11px] text-muted">
          Anyone with this link can sign in by email and join.
        </p>
      </section>

      <section className="mt-7 flex flex-col gap-2">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
          Invite via Code
        </p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={data.joinCode}
            className="h-11 w-32 rounded-md border border-hairline bg-[color-mix(in_srgb,var(--surface)_80%,var(--parchment))] px-3 text-center font-mono text-[14px] uppercase tracking-widest text-ink"
          />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(data.joinCode);
              setCodeCopied(true);
              window.setTimeout(() => setCodeCopied(false), 1500);
            }}
            className="inline-flex h-11 items-center gap-1.5 rounded-md border border-hairline px-4 font-display text-[11px] font-semibold uppercase tracking-wider text-ink-soft transition hover:bg-cod-soft hover:text-ink"
          >
            {codeCopied ? <Check size={14} className="text-vote-yes" /> : <Copy size={14} />}
            {codeCopied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="font-body text-[11px] text-muted">
          Anyone can enter this code on their Vestige home screen to join — no email needed.
        </p>
      </section>

      {data.addableUsers.length > 0 && (
        <section className="mt-7 flex flex-col gap-3">
          <div>
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
              Add a player you invited
            </p>
            <p className="mt-1 font-body text-[11px] text-muted">
              These people signed up but aren&apos;t in any campaign yet.
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {data.addableUsers.map((u) => (
              <li
                key={u.userId}
                className="flex items-center justify-between gap-3 rounded-md border border-hairline bg-cod-soft px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar url={u.avatarUrl} name={u.name || u.email} />
                  <span className="min-w-0">
                    <span className="block truncate font-body text-[14px] text-ink">{u.name || u.email}</span>
                    {u.name && <span className="block truncate font-body text-[11px] text-muted">{u.email}</span>}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => addExistingMember(data.campaignId, u.userId), () => setNotice("Player added."))}
                  className="rounded-md border border-hairline px-3 py-1.5 font-display text-[11px] font-semibold uppercase tracking-wider text-ink-soft transition hover:bg-parchment hover:text-ink"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => sendInvite(data.campaignId, email),
            () => {
              setEmail("");
              setNotice("Invitation sent.");
            },
          );
        }}
        className="mt-7 flex flex-col gap-1.5"
      >
        <label className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
          Invite via E-Mail
        </label>
        <div className="flex items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="adventurer@example.com"
            className="h-11 flex-1 rounded-md border border-hairline bg-[color-mix(in_srgb,var(--surface)_80%,var(--parchment))] px-3 font-body text-ink outline-none transition focus:border-gold"
          />
          <button
            type="submit"
            disabled={pending}
            className="h-11 rounded-lg bg-wine px-5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-3 rounded-md border border-vote-no/40 bg-vote-no/10 px-3 py-2 font-body text-[12px] text-vote-no">
          {error}
        </p>
      )}
      {notice && !error && (
        <p className="mt-3 rounded-md border border-vote-yes/40 bg-vote-yes/10 px-3 py-2 font-body text-[12px] text-vote-yes">
          {notice}
        </p>
      )}
    </div>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-wine font-display text-[12px] text-white">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}
