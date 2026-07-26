/**
 * The emoji a journal paragraph can be reacted with. Fixed set rather than a
 * full picker: it keeps the hover bar small and the stored values predictable.
 *
 * Deliberately a plain module, NOT the "use server" actions file. A file with
 * the "use server" directive may only export async functions — exporting this
 * array from there made the client import a value that doesn't survive the
 * server-action boundary, and the picker threw a client-side exception the
 * moment it rendered.
 */
export const REACTION_EMOJI = ["👍", "😂", "😮", "❤️", "🔥", "💀", "🎲"] as const;

export type ReactionEmoji = (typeof REACTION_EMOJI)[number];

export function isReactionEmoji(value: string): value is ReactionEmoji {
  return (REACTION_EMOJI as readonly string[]).includes(value);
}
