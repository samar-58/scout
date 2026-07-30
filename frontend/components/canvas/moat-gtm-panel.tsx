"use client";

import { Route, Shield } from "lucide-react";
import { CanvasSection } from "@/components/canvas/canvas-section";
import type { ReportGTMStrategy, ReportMoatAnalysis } from "@/lib/report-types";

export function MoatGtmPanel({
  moat,
  gtm,
  index,
}: {
  moat?: ReportMoatAnalysis;
  gtm?: ReportGTMStrategy;
  index: number;
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
      index={index}
      icon={Shield}
      eyebrow="Defensibility and distribution"
      title="Why this holds, and how it reaches people"
    >
      <div className="grid gap-3.5 lg:grid-cols-2">
        {(moatRows.length > 0 || realistic) && (
          <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-background">
            <h4 className="flex items-center gap-2 border-b border-border bg-surface-sunken/60 px-4 py-3 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              <Shield size={13} className="text-chart-4" />
              Moat
            </h4>
            <dl className="divide-y divide-border">
              {moatRows.map((row) => (
                <Row key={row.label} label={row.label} value={row.value as string} />
              ))}
            </dl>
            {realistic && (
              <p className="mt-auto border-t border-chart-4/25 bg-chart-4/[0.07] px-4 py-3 text-[12.5px] leading-relaxed text-foreground/85">
                <span className="font-semibold text-chart-4">
                  Realistically defensible:{" "}
                </span>
                {realistic}
              </p>
            )}
          </div>
        )}

        {gtmRows.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <h4 className="flex items-center gap-2 border-b border-border bg-surface-sunken/60 px-4 py-3 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              <Route size={13} className="text-chart-3" />
              Go to market
            </h4>
            <dl className="divide-y divide-border">
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
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[132px_1fr] sm:gap-4">
      <dt className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase sm:pt-0.5">
        {label}
      </dt>
      <dd className="text-[12.5px] leading-relaxed text-foreground/80 [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}
