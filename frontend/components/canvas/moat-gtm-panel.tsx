"use client";

import { CanvasSection } from "@/components/canvas/canvas-section";
import type { ReportGTMStrategy, ReportMoatAnalysis } from "@/lib/report-types";

export function MoatGtmPanel({
  moat,
  gtm,
}: {
  moat?: ReportMoatAnalysis;
  gtm?: ReportGTMStrategy;
}) {
  const moatRows = [
    { label: "Data", value: moat?.data_moat },
    { label: "Workflow lock-in", value: moat?.workflow_lock_in },
    { label: "Switching cost", value: moat?.switching_cost },
    { label: "Distribution", value: moat?.distribution_moat },
    { label: "Network effects", value: moat?.network_effects },
  ].filter((row) => row.value?.trim());

  const gtmRows = [
    { label: "First customer", value: gtm?.first_customer },
    { label: "Channels", value: gtm?.acquisition_channels?.join(", ") },
    { label: "Pricing", value: gtm?.pricing },
    { label: "First 100", value: gtm?.first_100_customers },
  ].filter((row) => row.value?.trim());

  const realistic = moat?.realistic_moat?.trim();
  if (moatRows.length === 0 && gtmRows.length === 0 && !realistic) return null;

  return (
    <CanvasSection
      id="moat"
      eyebrow="Defensibility and distribution"
      title="Why this holds, and how it reaches people"
    >
      <div className="grid gap-3 lg:grid-cols-2">
        {(moatRows.length > 0 || realistic) && (
          <div className="rounded-lg border border-border bg-background p-3.5">
            <h4 className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Moat
            </h4>
            <dl className="mt-2.5 space-y-2">
              {moatRows.map((row) => (
                <Row key={row.label} label={row.label} value={row.value as string} />
              ))}
            </dl>
            {realistic && (
              <p className="mt-3 border-t border-border pt-2.5 text-[12.5px] leading-relaxed text-foreground/80">
                <span className="font-semibold text-foreground">
                  Realistically defensible:{" "}
                </span>
                {realistic}
              </p>
            )}
          </div>
        )}

        {gtmRows.length > 0 && (
          <div className="rounded-lg border border-border bg-background p-3.5">
            <h4 className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Go to market
            </h4>
            <dl className="mt-2.5 space-y-2">
              {gtmRows.map((row) => (
                <Row key={row.label} label={row.label} value={row.value as string} />
              ))}
            </dl>
          </div>
        )}
      </div>
    </CanvasSection>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[128px_1fr] sm:gap-3">
      <dt className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase sm:pt-0.5">
        {label}
      </dt>
      <dd className="text-[12.5px] leading-relaxed text-foreground/80 [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}
