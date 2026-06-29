import { VoteChip } from "./VoteChip";

export function Legend({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 text-xs text-ink-soft">
      <span className="inline-flex items-center gap-1.5">
        <VoteChip value="yes" size="sm" />
        <span>{compact ? "Available" : "available"}</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <VoteChip value="maybe" size="sm" />
        <span>{compact ? "Maybe" : "maybe"}</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <VoteChip value="no" size="sm" />
        <span>{compact ? "Out" : "out"}</span>
      </span>
    </div>
  );
}
