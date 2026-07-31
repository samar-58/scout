"use client";

import { CanvasSection } from "@/components/canvas/canvas-section";
import type { ReportGTMStrategy, ReportMoatAnalysis } from "@/lib/report-types";

/**
 * Moat and go-to-market, as two definition lists side by side.
 *
 * Both were bordered cards with sunken headers, an icon tinted from the chart
 * palette, and — for the moat — a coloured conclusion footer. The conclusion is
 * the most important line here, so it now leads the column as plain prose
 * instead of being a tinted afterthought at the bottom.
 */
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
      eyebrow="Moat & GTM"
      title="Why this holds, and how it reaches people"
    >
      <div className="grid gap-x-10 gap-y-7 lg:grid-cols-2">
        {(moatRows.length > 0 || realistic) && (
          <div className="min-w-0">
            <h4 className="border-b border-border pb-2 text-[13px] font-medium">
              Moat
            </h4>
            {realistic && (
              <p className="pt-3 text-[13px] leading-relaxed text-foreground/85">
                {realistic}
              </p>
            )}
            <dl className="mt-1">
              {moatRows.map((row) => (
                <Row key={row.label} label={row.label} value={row.value as string} />
              ))}
            </dl>
          </div>
        )}

        {gtmRows.length > 0 && (
          <div className="min-w-0">
            <h4 className="border-b border-border pb-2 text-[13px] font-medium">
              Go to market
            </h4>
            <dl>
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
    <div className="grid gap-0.5 border-b border-border py-2.5 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-[12.5px] text-muted-foreground">{label}</dt>
      <dd className="text-[13px] leading-relaxed text-foreground/80 [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}
