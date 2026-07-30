"use client";

import { CanvasSection } from "@/components/canvas/canvas-section";
import type { ReportCompetitor } from "@/lib/report-types";

export function CompetitorBoard({
  competitors,
}: {
  competitors?: ReportCompetitor[];
}) {
  const entries = (competitors ?? []).filter((competitor) =>
    competitor.name?.trim(),
  );
  if (entries.length === 0) return null;

  return (
    <CanvasSection
      id="competitors"
      eyebrow="Competitive landscape"
      title="Who already owns this customer"
      description="Each card ends with the opening Scout thinks is left — that is where a wedge can exist."
    >
      <div className="grid gap-3 lg:grid-cols-2">
        {entries.map((competitor, index) => (
          <article
            key={`${competitor.name}-${index}`}
            className="flex flex-col rounded-lg border border-border bg-background p-3.5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h4 className="font-serif text-[15px] font-semibold tracking-tight [overflow-wrap:anywhere]">
                {competitor.name}
              </h4>
              {competitor.pricing?.trim() && (
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  {competitor.pricing}
                </span>
              )}
            </div>

            <dl className="mt-2.5 space-y-2">
              {competitor.icp?.trim() && (
                <Row label="Serves" value={competitor.icp} />
              )}
              {competitor.weakness?.trim() && (
                <Row label="Weakness" value={competitor.weakness} />
              )}
            </dl>

            {competitor.opportunity?.trim() && (
              <p className="mt-3 rounded-md border border-brand/30 bg-brand-muted p-2.5 text-[12.5px] leading-relaxed text-brand">
                <span className="font-semibold">Your opening: </span>
                {competitor.opportunity}
              </p>
            )}
          </article>
        ))}
      </div>
    </CanvasSection>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[76px_1fr] sm:gap-3">
      <dt className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase sm:pt-0.5">
        {label}
      </dt>
      <dd className="text-[12.5px] leading-relaxed text-foreground/80 [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}
