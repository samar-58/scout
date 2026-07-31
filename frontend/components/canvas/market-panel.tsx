"use client";

import { CanvasSection } from "@/components/canvas/canvas-section";
import type { ReportMarketAnalysis } from "@/lib/report-types";

/**
 * Market size and timing.
 *
 * The four size figures were tiles, each with its own coloured cap and coloured
 * label from the chart palette — colour used as decoration, since TAM is not a
 * different *kind* of thing from SAM. They are now one row of figures, which is
 * also how they compare best.
 */
export function MarketPanel({ market }: { market?: ReportMarketAnalysis }) {
  if (!market) return null;

  const figures = [
    { label: "TAM", caption: "Total addressable", value: market.tam },
    { label: "SAM", caption: "Serviceable", value: market.sam },
    { label: "SOM", caption: "Obtainable", value: market.som },
    { label: "CAGR", caption: "Growth rate", value: market.cagr },
  ].filter((figure) => figure.value?.trim());

  const notes = [
    { label: "Why now", value: market.why_now },
    { label: "Why nobody has won it", value: market.why_not_already_won },
  ].filter((note) => note.value?.trim());

  const trends = (market.trends ?? []).filter((trend) => trend.trim());

  if (figures.length === 0 && notes.length === 0 && trends.length === 0) {
    return null;
  }

  return (
    <CanvasSection
      id="market"
      eyebrow="Market"
      title="Size and timing"
      description="Ranges from public sources. Treat them as order-of-magnitude, not precision."
    >
      {figures.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-8 gap-y-5 border-b border-border pb-5 lg:grid-cols-4">
          {figures.map((figure) => (
            <div key={figure.label} className="min-w-0">
              <dt className="label">{figure.label}</dt>
              <dd className="mt-1.5 font-serif text-[1.35rem] leading-tight font-semibold [overflow-wrap:anywhere]">
                {figure.value}
              </dd>
              <dd className="mt-1 text-[12px] text-muted-foreground">
                {figure.caption}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {trends.length > 0 && (
        <ul className="mt-5 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
          {trends.map((trend) => (
            <li
              key={trend}
              className="text-[13px] leading-relaxed text-foreground/80"
            >
              {trend}
            </li>
          ))}
        </ul>
      )}

      {notes.length > 0 && (
        <dl className="mt-6 grid gap-x-10 gap-y-4 lg:grid-cols-2">
          {notes.map((note) => (
            <div key={note.label}>
              <dt className="text-[12.5px] text-muted-foreground">{note.label}</dt>
              <dd className="mt-1 text-[13px] leading-relaxed text-foreground/85">
                {note.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </CanvasSection>
  );
}
