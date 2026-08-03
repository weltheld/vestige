import Link from "next/link";
import { Plus } from "lucide-react";

/**
 * "New entry," reshaped into a tile the same size as the entries it sits
 * beside — the Codex counterpart to Journal's AddSessionCard, and for the
 * same reason: the header row it used to live in held nothing else once the
 * page headline was dropped.
 *
 * One tile before all five kind sections rather than one per section: the
 * new-entry form doesn't take a kind, so there's nothing for a per-section
 * add card to pre-fill, and five identical ghost tiles would just repeat
 * the same action five times.
 */
export function AddNpcCard({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-[100px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-hairline text-muted transition hover:border-gold hover:text-gold"
    >
      <Plus size={16} />
      <span className="font-display text-[11px] font-semibold uppercase tracking-[0.08em]">
        New entry
      </span>
    </Link>
  );
}
