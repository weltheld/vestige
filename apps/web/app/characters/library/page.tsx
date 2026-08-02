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

  // Names for the "played by" note. Only campaigns that actually hold one of
  // these sheets are worth asking about.
  const filedIn = [...new Set(entries.map((e) => e.campaignId).filter(Boolean))] as string[];
  const rosters = await Promise.all(filedIn.map((id) => getCampaignPlayers(supabase, id)));
  const playerNames = Object.fromEntries(
    rosters.flat().map((p) => [p.userId, p.characterName] as const),
  );

  return (
    <main className="mx-auto flex w-full max-w-[900px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-8 lg:px-12">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl text-ink">Your characters</h1>
        <p className="font-body text-[14px] text-ink-soft">
          Characters you have sent from Foundry. Put one in a campaign and
          everyone at that table can read it; your DM decides who plays it.
        </p>
      </div>

      {connection && <FoundryConnectionCard connection={connection} />}

      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <LibraryList entries={entries} campaigns={campaigns} playerNames={playerNames} />
      )}
    </main>
  );
}

/** The instructions live here because the sending happens in another
 *  application, and an empty list says nothing about how to fill it. */
function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl bg-cod-soft px-6 py-16 text-center">
      <Feather size={48} className="text-muted" strokeWidth={1.25} />
      <p className="max-w-[440px] font-body text-[15px] text-ink-soft">
        Nothing sent yet.
      </p>
      <ol className="flex max-w-[460px] flex-col gap-1 text-left font-body text-[13px] text-muted">
        <li>1. Install the vestige-foundry module in your Foundry world.</li>
        <li>2. Paste the URL and token above into its settings.</li>
        <li>3. Use Send to Vestige on a character sheet.</li>
      </ol>
      <p className="max-w-[440px] font-body text-[12px] italic text-muted">
        D&amp;D 5e player characters only. Sending the same character again
        updates it here rather than adding a second copy.
      </p>
    </div>
  );
}
