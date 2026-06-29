"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Mail, X } from "lucide-react";
import {
  acceptInvitationAction,
  declineInvitationAction,
} from "@/app/home/inviteActions";

export type PendingInvite = {
  id: string;
  campaignName: string;
};

export function PendingInvites({ invites }: { invites: PendingInvite[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (invites.length === 0) return null;

  function respond(
    id: string,
    action: typeof acceptInvitationAction | typeof declineInvitationAction,
  ) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await action(id);
      if (!result.ok) {
        setError(result.error);
        setPendingId(null);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="mb-7 flex flex-col gap-3 rounded-xl border border-dm-gold/50 bg-dm-gold/10 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-dm-gold" />
        <h2 className="font-display text-base font-bold text-ink">
          Pending invitations
        </h2>
      </div>
      <p className="font-body text-sm text-ink-soft">
        You&apos;ve been invited to these campaigns. Accept to join, or decline.
      </p>

      {error && (
        <p className="rounded-md border border-vote-no/40 bg-vote-no/10 px-3 py-2 text-xs text-vote-no">
          {error}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {invites.map((inv) => {
          const busy = pendingId === inv.id;
          return (
            <li
              key={inv.id}
              className="flex items-center gap-3 rounded-lg border border-hairline bg-surface px-3 py-2.5"
            >
              <span className="min-w-0 flex-1 truncate font-display text-sm font-bold text-ink">
                {inv.campaignName}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => respond(inv.id, acceptInvitationAction)}
                className="inline-flex items-center gap-1.5 rounded-full bg-wine px-3 py-1.5 text-xs font-body font-bold text-surface hover:brightness-110 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                Accept
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => respond(inv.id, declineInvitationAction)}
                className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1.5 text-xs font-body font-bold text-ink-soft hover:bg-parchment hover:text-vote-no disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                Decline
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
