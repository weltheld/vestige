import Link from "next/link";
import { Plus } from "lucide-react";

/**
 * "New session," reshaped into the first tile of the list it adds to.
 *
 * The header row that used to hold this button had nothing else left in it
 * once the page headline was dropped — a full line of parchment spent on one
 * right-aligned button. Matching SessionCard's own footprint (same min
 * height, same rounded corners) instead of inventing a new shape means the
 * page's content starts immediately below the platform header, with the
 * action sitting exactly where you're already looking: the top of the list.
 */
export function AddSessionCard({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-[112px] items-center justify-center gap-2 rounded-xl border-2 border-dashed border-hairline text-muted transition hover:border-gold hover:text-gold"
    >
      <Plus size={16} />
      <span className="font-display text-[13px] font-semibold uppercase tracking-[0.08em]">
        New session
      </span>
    </Link>
  );
}
