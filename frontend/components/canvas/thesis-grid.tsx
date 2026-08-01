"use client";

import { ArrowRight } from "lucide-react";
import { CanvasSection } from "@/components/canvas/canvas-section";
import { LocalTime } from "@/components/local-time";
import { Button } from "@/components/ui/button";
import { classifyThesisField } from "@/lib/loop-meta";
import type { ThesisCard } from "@/lib/report-canvas";
import type { ClaimRecord } from "@/lib/scout-api";

/**
 * Report thesis spine: short statements that define the business.
 *
 * Read-only here. Challenge and version history live on Validate.
 */
export function ThesisGrid({
  cards,
  updatedAt,
  claims,
  onOpenValidate,
}: {
  cards: ThesisCard[];
  updatedAt?: string;
  claims?: ClaimRecord[];
  onOpenValidate?: (sectionId?: string) => void;
}) {
  if (cards.length === 0) return null;

  return (
    <CanvasSection
      id="thesis"
      eyebrow="Thesis"
      title="What we are betting on"
      description="Asserted by you, backfilled by Scout where the composer was blank."
      action={
        onOpenValidate ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => onOpenValidate("thesis")}
          >
            Review on Validate
            <ArrowRight size={13} />
          </Button>
        ) : undefined
      }
    >
      {updatedAt && (
        <p className="mb-3 text-[12px] text-muted-foreground">
          From report saved <LocalTime value={updatedAt} />
        </p>
      )}
      <dl className="grid gap-x-10 sm:grid-cols-2">
        {cards.map((card) => {
          const counts = claimCountsForField(card.key, claims);
          return (
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
                {(counts.supporting > 0 || counts.contradicting > 0) && (
                  <span className="mt-1 block text-[11.5px] text-muted-foreground">
                    {counts.supporting > 0 && (
                      <span className="text-success">
                        {counts.supporting} supporting
                      </span>
                    )}
                    {counts.supporting > 0 && counts.contradicting > 0 && " · "}
                    {counts.contradicting > 0 && (
                      <span className="text-destructive">
                        {counts.contradicting} contradicting
                      </span>
                    )}
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </CanvasSection>
  );
}

function claimCountsForField(
  fieldKey: string,
  claims: ClaimRecord[] | undefined,
) {
  let supporting = 0;
  let contradicting = 0;
  for (const claim of claims ?? []) {
    if (classifyThesisField(claim.text) !== fieldKey) continue;
    if (claim.stance === "supporting" || claim.stance === "pain") supporting += 1;
    else if (claim.stance === "contradicting" || claim.stance === "competitor") {
      contradicting += 1;
    }
  }
  return { supporting, contradicting };
}
