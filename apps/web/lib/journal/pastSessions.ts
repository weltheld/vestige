import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@vestige/db";
import { format } from "date-fns";

type SB = SupabaseClient<Database>;

export type PastSessionLedgerEntry = {
  /** yyyy-MM-dd, the campaign's play date from the Calendar. */
  date: string;
  /** Set when a journal entry already exists for this date. */
  journalSessionId: string | null;
  title: string | null;
};

/**
 * Every Calendar play date in the past, newest first, matched against any
 * journal entry that shares its date — so a DM can see at a glance which
 * sessions still have nothing written up. Calendar dates and journal dates
 * are both plain `date` columns in the same `yyyy-MM-dd` format, so matching
 * is exact string equality, no timezone conversion.
 */
export async function getPastSessionsLedger(
  supabase: SB,
  campaignId: string,
): Promise<PastSessionLedgerEntry[]> {
  const today = format(new Date(), "yyyy-MM-dd");

  const [{ data: playDates }, { data: journalRows }] = await Promise.all([
    supabase
      .from("campaign_sessions")
      .select("date")
      .eq("campaign_id", campaignId)
      .lt("date", today),
    supabase
      .from("journal_sessions")
      .select("id, title, date")
      .eq("campaign_id", campaignId)
      .not("date", "is", null),
  ]);

  const journalByDate = new Map(
    (journalRows ?? []).map((s) => [s.date as string, { id: s.id, title: s.title }] as const),
  );

  return (playDates ?? [])
    .map((p) => p.date)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => {
      const match = journalByDate.get(date);
      return {
        date,
        journalSessionId: match?.id ?? null,
        title: match?.title ?? null,
      };
    });
}
