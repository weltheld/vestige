import { redirect } from "next/navigation";
import { Feather } from "lucide-react";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer, getMyCampaigns, getCampaignPlayers } from "@/lib/journal/data";
import { getLibrary } from "@/lib/characters/data";
import { getOrCreateFoundryConnection } from "@/lib/characters/foundry-link";
import { appHref } from "@/lib/journal/links";
import { FoundryConnectionCard } from "@/components/characters/FoundryConnectionCard";
import { LibraryList } from "@/components/characters/LibraryList";

/**
 * Your own characters, as pushed from Foundry.
 *
 * Not campaign-scoped, unlike everything else in this module: a push token
 * belongs to a person, so what arrives arrives here first and is filed into a
 * campaign afterwards. Pushing again updates the sheet and leaves the filing
 * alone, which is what makes syncing after every session worth doing.
 */
export default async function CharacterLibraryPage() {
  const supabase = await getServerSupabase();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(appHref());

  const [connection, entries, campaigns] = await Promise.all([
    getOrCreateFoundryConnection(supabase, viewer.id),
    getLibrary(supabase, viewer.id),
    getMyCampaigns(supabase, viewer.id),
  ]);

  // Who is at each table, so the player dropdown can be filled in without a
  // round trip when a campaign is chosen. Every campaign the viewer belongs
  // to, not just the ones already holding a sheet — the point of the page is
  // to file the ones that aren't.
  const rosters = await Promise.all(
    campaigns.map(async (c) => [c.id, await getCampaignPlayers(supabase, c.id)] as const),
  );
  const playersByCampaign = Object.fromEntries(rosters);

  return (
    <main className="mx-auto flex w-full max-w-[900px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-8 lg:px-12">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl text-ink">Manage characters</h1>
        <p className="font-body text-[14px] text-ink-soft">
          Everything you have sent from Foundry. Put each character in a
          campaign and say who plays it — both survive the next sync.
        </p>
      </div>

      {connection ? (
        <FoundryConnectionCard connection={connection} />
      ) : (
        <NoConnection />
      )}

      {entries.length === 0 ? (
        <EmptyState hasConnection={!!connection} />
      ) : (
        <LibraryList
          entries={entries}
          campaigns={campaigns}
          playersByCampaign={playersByCampaign}
        />
      )}
    </main>
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
      <p className="max-w-[440px] font-body text-[15px] text-ink-soft">
        Nothing sent yet.
      </p>
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
