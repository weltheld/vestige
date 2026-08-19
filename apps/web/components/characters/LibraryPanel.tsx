"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Feather, X } from "lucide-react";
import type { HeaderCampaign } from "@vestige/ui";
import type { LibraryEntry } from "@/lib/characters/data";
import type { CampaignPlayer } from "@/lib/journal/data";
import type { FoundryConnection } from "@/lib/characters/foundry-link";
import { appHref } from "@/lib/journal/links";
import { FoundryConnectionCard } from "./FoundryConnectionCard";
import { LibraryList } from "./LibraryList";

/**
 * Managing your own characters — the whole of it, as either a page or a layer
 * over the page you opened it from.
 *
 * The two variants exist for the same reason the settings panel has them:
 * filing a character is a short errand you do while looking at a sheet, so
 * arriving via the header menu keeps that sheet behind you, while a direct
 * visit or a reload still gets a real page.
 *
 * This also absorbed the old "Who plays what" table, which allocated players
 * and nothing else — a strict subset of a row here, in a second place that
 * could disagree with this one.
 */
export function LibraryPanel({
  connection,
  entries,
  campaigns,
  playersByCampaign,
  variant = "page",
}: {
  connection: FoundryConnection | null;
  entries: LibraryEntry[];
  campaigns: HeaderCampaign[];
  playersByCampaign: Record<string, CampaignPlayer[]>;
  variant?: "page" | "modal";
}) {
  const router = useRouter();

  const body = (
    <>
      {connection ? <FoundryConnectionCard connection={connection} /> : <NoConnection />}

      {entries.length === 0 ? (
        <EmptyState hasConnection={!!connection} />
      ) : (
        <LibraryList
          entries={entries}
          campaigns={campaigns}
          playersByCampaign={playersByCampaign}
        />
      )}
    </>
  );

  if (variant === "modal") {
    return (
      <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
        <button
          aria-label="Close"
          className="fixed inset-0 bg-[color-mix(in_srgb,var(--ink)_50%,transparent)] backdrop-blur-sm"
          onClick={() => router.back()}
        />
        <div className="relative flex w-full max-w-[900px] flex-col gap-5 rounded-xl border border-hairline bg-parchment px-5 py-5 shadow-parchment sm:px-7 sm:py-6">
          <div className="flex items-start justify-between gap-3">
            <Heading />
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Close"
              className="rounded-md p-1 text-ink-soft transition hover:bg-cod-soft hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {body}
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[900px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-8 lg:px-12">
      {/* The only way out of this page: the characters/ layout strips the
          usual site header for the whole subtree so the modal variant of
          this same panel can overlay a sheet cleanly, but that leaves a
          direct visit or reload of the standalone page — which is what
          Next.js falls back to whenever this isn't reached via an in-app
          <Link> — with no chrome at all. The modal variant already has its
          own close button; this is the one variant that needed one. */}
      <Link
        href={appHref()}
        className="inline-flex w-fit items-center gap-1.5 font-body text-[13px] text-ink-soft transition hover:text-gold"
      >
        <ArrowLeft size={14} />
        Back to Vestige Campaign
      </Link>
      <Heading />
      {body}
    </main>
  );
}

function Heading() {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-display text-3xl text-ink">Manage characters</h1>
      <p className="font-body text-[14px] text-ink-soft">
        Everything you have sent from Foundry. Put each character in a campaign
        and say who plays it — both survive the next sync.
      </p>
    </div>
  );
}

/**
 * Said out loud rather than by rendering nothing.
 *
 * A token is created on first view, so the only way to have none is for the
 * write to have failed — in practice, the foundry_connections migration not
 * having been applied. Vestige migrations are run by hand, so this is a
 * normal state to pass through, and an absent panel that the instructions
 * still refer to is worse than a sentence explaining itself.
 */
function NoConnection() {
  return (
    <div className="rounded-xl border border-hairline bg-cod-soft px-5 py-4">
      <p className="font-body text-[13px] text-ink">
        Your push token could not be loaded, so Foundry cannot send characters
        here yet.
      </p>
      <p className="pt-1 font-body text-[12px] text-muted">
        If this is a fresh deploy, the database migration for this feature has
        not been applied yet.
      </p>
    </div>
  );
}

/** The instructions live here because the sending happens in another
 *  application, and an empty list says nothing about how to fill it. */
function EmptyState({ hasConnection }: { hasConnection: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl bg-cod-soft px-6 py-16 text-center">
      <Feather size={48} className="text-muted" strokeWidth={1.25} />
      <p className="max-w-[440px] font-body text-[15px] text-ink-soft">Nothing sent yet.</p>
      {hasConnection && (
        <ol className="flex max-w-[460px] flex-col gap-1 text-left font-body text-[13px] text-muted">
          <li>1. Install the vestige-foundry module in your Foundry world.</li>
          <li>2. Paste the URL and token above into its settings.</li>
          <li>3. Use Send to Vestige on a character sheet.</li>
        </ol>
      )}
      <p className="max-w-[440px] font-body text-[12px] italic text-muted">
        D&amp;D 5e player characters only. Sending the same character again
        updates it here rather than adding a second copy.
      </p>
    </div>
  );
}
