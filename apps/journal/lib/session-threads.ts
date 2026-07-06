import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, JournalRevisionActionDb } from "@vestige/db";

type SB = SupabaseClient<Database>;

export type Revision = {
  id: string;
  action: JournalRevisionActionDb;
  authorName: string;
  authorAvatar: string | null;
  createdAt: string;
  beforeValue: Record<string, unknown> | null;
  afterValue: Record<string, unknown> | null;
};

function name(p: { first_name: string | null; display_name: string | null } | undefined) {
  return p?.first_name?.trim() || p?.display_name?.trim() || "Unknown";
}

async function authorMap(supabase: SB, ids: string[]) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map<string, { first_name: string | null; display_name: string | null; avatar_url: string | null }>();
  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, display_name, avatar_url")
    .in("id", unique);
  return new Map((data ?? []).map((p) => [p.id, p]));
}

export async function getRevisions(supabase: SB, sessionId: string): Promise<Revision[]> {
  const { data } = await supabase
    .from("journal_session_revisions")
    .select("id, action, author_id, before_value, after_value, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  const rows = data ?? [];
  const authors = await authorMap(supabase, rows.map((r) => r.author_id));
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    authorName: name(authors.get(r.author_id)),
    authorAvatar: authors.get(r.author_id)?.avatar_url ?? null,
    createdAt: r.created_at,
    beforeValue: (r.before_value as Record<string, unknown> | null) ?? null,
    afterValue: (r.after_value as Record<string, unknown> | null) ?? null,
  }));
}
