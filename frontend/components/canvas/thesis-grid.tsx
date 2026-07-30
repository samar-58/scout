"use client";

import { Compass } from "lucide-react";
import { CanvasSection } from "@/components/canvas/canvas-section";
import type { ThesisCard } from "@/lib/report-canvas";

/**
 * The spine of the canvas: six short statements that define the business.
 * Origin badges keep Scout honest — "you" means the founder asserted it in the
 * composer, "scout" means it was inferred from research because the field was
 * left blank.
 */
export function ThesisGrid({
  cards,
  index,
}: {
  cards: ThesisCard[];
  index: number;
}) {
  if (cards.length === 0) return null;

  return (
    <CanvasSection
      id="thesis"
      index={index}
      icon={Compass}
      eyebrow="Startup thesis"
      title="What we are betting on"
      description="Asserted by you, backfilled by Scout where the composer was blank."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.key}
            className="group relative overflow-hidden rounded-xl border border-border bg-background p-4 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-0.5 bg-brand opacity-0 transition-opacity group-hover:opacity-100"
            />
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {card.label}
              </h4>
              <span
                className={
                  card.origin === "founder"
                    ? "rounded-full border border-border-strong px-1.5 py-0.5 font-mono text-[9px] tracking-wide text-foreground/60 uppercase"
                    : "rounded-full border border-brand/30 bg-brand-muted px-1.5 py-0.5 font-mono text-[9px] tracking-wide text-brand uppercase"
                }
              >
                {card.origin === "founder" ? "You" : "Scout"}
              </span>
            </div>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-foreground/85 [overflow-wrap:anywhere]">
              {card.value}
            </p>
          </article>
        ))}
      </div>
    </CanvasSection>
  );
}
