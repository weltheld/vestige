import { Quote } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { SessionDetail, Annotation } from "@/lib/session-detail";
import { NOTE_SECTIONS, blocksFor, excerpt } from "@/lib/notes";
import { AnnotationBadge, AnnotationAdder } from "./AnnotationControls";

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
        const sectionAnnCount =
          key === "notes"
            ? blocks.reduce((n, b) => n + (session.annotationsByAnchor[b.anchor]?.length ?? 0), 0)
            : 0;
        return (
          <section key={key} className="flex flex-col">
            <div className="flex items-center gap-2.5 pb-3">
              <span className="h-3.5 w-0.5 bg-gold" />
              <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                {label}
              </h2>
              {key === "notes" && sectionAnnCount > 0 && (
                <span className="ml-auto font-body text-[10px] text-muted">
                  {sectionAnnCount} annotations
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
  const first = annotations[0];

  return (
    <div className="group relative">
      <div
        className={
          has
            ? "rounded-[10px] border-l-2 border-gold bg-[#f9f4e6] px-4 py-3"
            : ""
        }
      >
        <p className="font-body text-[15px] leading-[1.85] text-ink">{text}</p>
      </div>

      {has && <AnnotationBadge anchor={anchor} count={annotations.length} />}
      {!has && (
        <AnnotationAdder
          campaignId={campaignId}
          sessionId={sessionId}
          anchor={anchor}
          excerpt={excerpt(text, 60)}
        />
      )}

      {first && (
        <aside className="absolute left-[calc(100%+24px)] top-0 hidden w-[220px] flex-col gap-2 rounded-xl bg-cod-soft p-3.5 xl:flex">
          <Quote size={12} className="text-gold-soft" />
          <p className="border-l-2 border-gold pl-2 font-body text-[11px] italic leading-[1.5] text-ink-soft line-clamp-2">
            {excerpt(text)}
          </p>
          <p className="font-body text-[13px] leading-[1.5] text-ink">{first.body}</p>
          <div className="flex items-center gap-1.5">
            <span className="h-4 w-4 overflow-hidden rounded-full bg-wine text-center text-[8px] leading-4 text-parchment">
              {first.authorAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={first.authorAvatar} alt="" className="h-full w-full object-cover" />
              ) : (
                first.authorName.charAt(0)
              )}
            </span>
            <span className="font-display text-[11px] text-ink">{first.authorName}</span>
            <span className="font-body text-[10px] text-muted">
              · {format(parseISO(first.createdAt), "MMM d")}
            </span>
          </div>
        </aside>
      )}
    </div>
  );
}
