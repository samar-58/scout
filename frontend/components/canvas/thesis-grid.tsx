"use client";

import { CanvasSection } from "@/components/canvas/canvas-section";
import type { ThesisCard } from "@/lib/report-canvas";

/**
 * The spine of the canvas: short statements that define the business, as a
 * definition list.
 *
 * These were cards with hover lift, an accent edge that appeared on hover, and a
 * pill marking provenance. A term-and-value list says the same thing and lets
 * the eye run down the labels; provenance is one quiet word after the value.
 */
export function ThesisGrid({ cards }: { cards: ThesisCard[] }) {
  if (cards.length === 0) return null;

  return (
    <CanvasSection
      id="thesis"
      eyebrow="Thesis"
      title="What we are betting on"
      description="Asserted by you, backfilled by Scout where the composer was blank."
    >
      <dl className="grid gap-x-10 sm:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.key}
            className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-baseline gap-3 border-b border-border py-3"
          >
            <dt className="text-[12.5px] text-muted-foreground">{card.label}</dt>
            <dd className="min-w-0 text-[13px] leading-relaxed [overflow-wrap:anywhere]">
              {card.value}
              {card.origin === "scout" && (
                <span
                  className="ml-1.5 text-[11.5px] text-subtle-foreground"
                  title="Inferred by Scout because this field was left blank"
                >
                  inferred
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </CanvasSection>
  );
}
