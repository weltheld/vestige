import type { SessionDetail, Annotation } from "@/lib/session-detail";
import { NOTE_SECTIONS, blocksFor, excerpt } from "@/lib/notes";
import { AnnotationThread } from "./AnnotationControls";

export function NotesBody({ session, campaignId }: { session: SessionDetail; campaignId: string }) {
  const text: Record<string, string | null> = {
    summary: session.summary,
    player_characters: session.playerCharacters,
    npcs: session.npcs,
    notes: session.notes,
  };

  return (
    <div className="relative flex flex-col gap-9 pt-7">
      {NOTE_SECTIONS.map(({ key, label }) => {
        const blocks = blocksFor(key, text[key] ?? null);
        const sectionCommentCount = blocks.reduce(
          (n, b) => n + (session.annotationsByAnchor[b.anchor]?.length ?? 0),
          0,
        );
        return (
          <section key={key} className="flex flex-col">
            <div className="flex items-center gap-2.5 pb-3">
              <span className="h-3.5 w-0.5 bg-gold" />
              <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                {label}
              </h2>
              {sectionCommentCount > 0 && (
                <span className="ml-auto font-body text-[10px] text-muted">
                  {sectionCommentCount} {sectionCommentCount === 1 ? "comment" : "comments"}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-4">
              {blocks.length === 0 ? (
                <p className="font-body text-[15px] italic leading-[1.85] text-muted">
                  Nothing recorded here yet.
                </p>
              ) : (
                blocks.map((b) => (
                  <AnnotatedParagraph
                    key={b.anchor}
                    anchor={b.anchor}
                    text={b.text}
                    annotations={session.annotationsByAnchor[b.anchor] ?? []}
                    campaignId={campaignId}
                    sessionId={session.id}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function AnnotatedParagraph({
  anchor,
  text,
  annotations,
  campaignId,
  sessionId,
}: {
  anchor: string;
  text: string;
  annotations: Annotation[];
  campaignId: string;
  sessionId: string;
}) {
  const has = annotations.length > 0;

  return (
    <div className="group relative">
      <div className={has ? "rounded-[10px] border-l-2 border-gold bg-cod-soft px-4 py-3" : ""}>
        <p className="font-body text-[15px] leading-[1.85] text-ink">{text}</p>
      </div>

      <AnnotationThread
        campaignId={campaignId}
        sessionId={sessionId}
        anchor={anchor}
        excerpt={excerpt(text, 60)}
        annotations={annotations}
      />
    </div>
  );
}
