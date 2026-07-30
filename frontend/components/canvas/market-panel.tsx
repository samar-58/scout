"use client";

import { TrendingUp } from "lucide-react";
import { CanvasSection } from "@/components/canvas/canvas-section";
import type { ReportMarketAnalysis } from "@/lib/report-types";

const TILE_COLORS = [
  "var(--chart-1)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-3)",
];

export function MarketPanel({
  market,
  index,
}: {
  market?: ReportMarketAnalysis;
  index: number;
}) {
  if (!market) return null;

  const tiles = [
    { label: "TAM", caption: "Total addressable", value: market.tam },
    { label: "SAM", caption: "Serviceable", value: market.sam },
    { label: "SOM", caption: "Obtainable", value: market.som },
    { label: "CAGR", caption: "Growth rate", value: market.cagr },
  ].filter((tile) => tile.value?.trim());

  const notes = [
    { label: "Why now", value: market.why_now },
    { label: "Why nobody has won it", value: market.why_not_already_won },
  ].filter((note) => note.value?.trim());

  const trends = (market.trends ?? []).filter((trend) => trend.trim());

  if (tiles.length === 0 && notes.length === 0 && trends.length === 0) {
    return null;
  }

  return (
    <CanvasSection
      id="market"
      index={index}
      icon={TrendingUp}
      eyebrow="Market"
      title="Size and timing"
      description="Ranges from public sources. Treat them as order-of-magnitude, not precision."
    >
      {tiles.length > 0 && (
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((tile, position) => (
            <div
              key={tile.label}
              className="relative overflow-hidden rounded-xl border border-border bg-background p-4"
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-0.5"
                style={{ backgroundColor: TILE_COLORS[position % TILE_COLORS.length] }}
              />
              <dt
                className="font-mono text-[10px] tracking-[0.14em] uppercase"
                style={{ color: TILE_COLORS[position % TILE_COLORS.length] }}
              >
                {tile.label}
              </dt>
              <dd className="mt-2 font-serif text-[1.15rem] leading-tight font-semibold text-foreground [overflow-wrap:anywhere]">
                {tile.value}
              </dd>
              <dd className="mt-1 text-[11px] text-muted-foreground">
                {tile.caption}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {trends.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {trends.map((trend) => (
            <span
              key={trend}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-[12.5px] leading-snug text-foreground/80"
            >
              {trend}
            </span>
          ))}
        </div>
      )}

      {notes.length > 0 && (
        <dl className="mt-3 grid gap-3 lg:grid-cols-2">
          {notes.map((note) => (
            <div
              key={note.label}
              className="rounded-xl border border-border bg-surface-sunken/70 p-4"
            >
              <dt className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {note.label}
              </dt>
              <dd className="mt-2 text-[13px] leading-relaxed text-foreground/80">
                {note.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </CanvasSection>
  );
}
