"use client";

import { Crosshair } from "lucide-react";
import { CanvasSection } from "@/components/canvas/canvas-section";
import type { ReportCompetitor } from "@/lib/report-types";

export function CompetitorBoard({
  competitors,
  index,
}: {
  competitors?: ReportCompetitor[];
  index: number;
}) {
  const entries = (competitors ?? []).filter((competitor) =>
    competitor.name?.trim(),
  );
  if (entries.length === 0) return null;

  return (
    <CanvasSection
      id="competitors"
      index={index}
      icon={Crosshair}
      eyebrow="Competitive landscape"
      title="Who already owns this customer"
      description="Each card ends with the opening Scout thinks is left — that is where a wedge can exist."
      action={
        <span className="rounded-full border border-border px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
          {entries.length} mapped
        </span>
      }
    >
      <div className="grid gap-3.5 xl:grid-cols-2">
        {entries.map((competitor, position) => (
          <article
            key={`${competitor.name}-${position}`}
            className="flex flex-col overflow-hidden rounded-xl border border-border bg-background transition-all hover:border-brand/40 hover:shadow-md"
          >
            <div className="flex items-baseline justify-between gap-3 border-b border-border bg-surface-sunken/60 px-4 py-3">
              <h4 className="font-serif text-[15.5px] font-semibold tracking-tight [overflow-wrap:anywhere]">
                {competitor.name}
              </h4>
              {competitor.pricing?.trim() && (
                <span className="shrink-0 rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[11px] text-foreground/70">
                  {competitor.pricing}
                </span>
              )}
            </div>

            <dl className="space-y-2.5 px-4 py-3.5">
              {competitor.icp?.trim() && (
                <Row label="Serves" value={competitor.icp} />
              )}
              {competitor.weakness?.trim() && (
                <Row label="Weakness" value={competitor.weakness} />
              )}
            </dl>

            {competitor.opportunity?.trim() && (
              <p className="mt-auto border-t border-brand/25 bg-brand-muted/50 px-4 py-3 text-[12.5px] leading-relaxed text-foreground/85">
                <span className="font-semibold text-brand">Your opening: </span>
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
    <div className="grid gap-1 sm:grid-cols-[84px_1fr] sm:gap-4">
      <dt className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase sm:pt-0.5">
        {label}
      </dt>
      <dd className="text-[12.5px] leading-relaxed text-foreground/80 [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}
