"use client";

import { CanvasSection } from "@/components/canvas/canvas-section";
import type { ReportMarketAnalysis } from "@/lib/report-types";

export function MarketPanel({ market }: { market?: ReportMarketAnalysis }) {
  if (!market) return null;

  const tiles = [
    { label: "TAM", value: market.tam },
    { label: "SAM", value: market.sam },
    { label: "SOM", value: market.som },
    { label: "CAGR", value: market.cagr },
  ].filter((tile) => tile.value?.trim());

  const notes = [
    { label: "Why now", value: market.why_now },
    { label: "Why nobody has won it", value: market.why_not_already_won },
  ].filter((note) => note.value?.trim());

  if (tiles.length === 0 && notes.length === 0) return null;

  return (
    <CanvasSection
      id="market"
      eyebrow="Market"
      title="Size and timing"
      description="Ranges from public sources. Treat them as order-of-magnitude, not precision."
    >
      {tiles.length > 0 && (
        <dl className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className="rounded-lg border border-border bg-background p-3"
            >
              <dt className="font-mono text-[10px] tracking-[0.12em] text-brand uppercase">
                {tile.label}
              </dt>
              <dd className="mt-1.5 font-serif text-[15px] leading-snug font-semibold text-foreground [overflow-wrap:anywhere]">
                {tile.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {market.trends && market.trends.length > 0 && (
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {market.trends.map((trend) => (
            <li
              key={trend}
              className="flex gap-2 text-[12.5px] leading-relaxed text-foreground/75"
            >
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand" />
              {trend}
            </li>
          ))}
        </ul>
      )}

      {notes.length > 0 && (
        <dl className="mt-3 grid gap-2.5 lg:grid-cols-2">
          {notes.map((note) => (
            <div
              key={note.label}
              className="rounded-lg border border-border bg-secondary/40 p-3"
            >
              <dt className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {note.label}
              </dt>
              <dd className="mt-1.5 text-[12.5px] leading-relaxed text-foreground/80">
                {note.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </CanvasSection>
  );
}
