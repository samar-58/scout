"use client";

import { ArrowRight, ChevronDown, Sparkle } from "lucide-react";
import { ScoreRadar } from "@/components/canvas/score-radar";
import { VerdictGauge } from "@/components/canvas/verdict-gauge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import type { CanvasDecision, CanvasDimension, DecisionTone } from "@/lib/report-canvas";
import { cn } from "@/lib/utils";

const TONE: Record<
  DecisionTone,
  { chip: string; rule: string; glow: string }
> = {
  proceed: {
    chip: "border-success/30 bg-success-muted text-success",
    rule: "from-success/70",
    glow: "color-mix(in oklab, var(--success) 12%, transparent)",
  },
  narrow: {
    chip: "border-brand/30 bg-brand-muted text-brand",
    rule: "from-brand/70",
    glow: "color-mix(in oklab, var(--brand) 14%, transparent)",
  },
  investigate: {
    chip: "border-warning/30 bg-warning-muted text-warning",
    rule: "from-warning/70",
    glow: "color-mix(in oklab, var(--warning) 13%, transparent)",
  },
  reconsider: {
    chip: "border-destructive/30 bg-destructive-muted text-destructive",
    rule: "from-destructive/70",
    glow: "color-mix(in oklab, var(--destructive) 12%, transparent)",
  },
};

export function VerdictHero({
  decision,
  dimensions,
  scoreExplanation,
  onStartExperiments,
}: {
  decision: CanvasDecision;
  dimensions: CanvasDimension[];
  scoreExplanation?: string;
  onStartExperiments?: () => void;
}) {
  const tone = TONE[decision.tone];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-md">
      {/* Tone rule + warm bloom keyed to the recommendation */}
      <div
        aria-hidden="true"
        className={cn("h-1 w-full bg-gradient-to-r to-transparent", tone.rule)}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-70"
        style={{
          background: `radial-gradient(60% 100% at 15% 0%, ${tone.glow}, transparent 70%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.35]" aria-hidden="true" />

      <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] text-brand uppercase">
              <Sparkle size={11} />
              Scout recommendation
            </span>
          </div>

          <h2 className="mt-3 font-serif text-[1.9rem] leading-[1.1] font-semibold tracking-tight text-balance sm:text-[2.4rem]">
            {decision.label}
          </h2>

          <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-foreground/80">
            {decision.summary}
          </p>

          {/* Mobile gauge sits inline; desktop uses the right column. */}
          <div className="mt-5 flex items-center gap-5 lg:hidden">
            <VerdictGauge
              value={decision.overall}
              tone={decision.tone}
              confidence={decision.confidence}
            />
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] uppercase",
                tone.chip,
              )}
            >
              {decision.label}
            </span>
          </div>

          {decision.changeConditions.length > 0 && (
            <div className="mt-6 rounded-xl border border-border bg-surface-sunken/70 p-4">
              <h3 className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                What would change this recommendation
              </h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {decision.changeConditions.map((condition, index) => (
                  <li
                    key={condition}
                    className="flex gap-2.5 text-[13px] leading-relaxed text-foreground/80"
                  >
                    <span className="mt-px font-mono text-[10px] text-brand">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {condition}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {onStartExperiments && (
              <Button type="button" onClick={onStartExperiments} className="h-10 gap-1.5">
                Plan the experiments
                <ArrowRight size={14} />
              </Button>
            )}
            {scoreExplanation && (
              <Collapsible className="group w-full sm:w-auto">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-10 items-center gap-1.5 rounded-md border border-border px-3.5 text-[13px] font-medium text-foreground/75 transition-colors hover:border-border-strong hover:text-foreground"
                  >
                    How the score was built
                    <ChevronDown
                      size={14}
                      className="transition-transform group-data-[state=open]:rotate-180"
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="mt-3 rounded-lg border border-border bg-surface-sunken/70 p-3.5 text-[13px] leading-relaxed text-foreground/75">
                    {scoreExplanation}
                  </p>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>

        {/* Desktop: gauge above radar in a dedicated column */}
        <div className="hidden shrink-0 flex-col items-center gap-2 lg:flex">
          <VerdictGauge
            value={decision.overall}
            tone={decision.tone}
            confidence={decision.confidence}
          />
          {dimensions.length > 0 && (
            <ScoreRadar dimensions={dimensions} className="-mt-2 w-[300px]" />
          )}
        </div>
      </div>

      {/* Mobile / tablet radar */}
      {dimensions.length > 0 && (
        <div className="relative border-t border-border px-5 py-5 lg:hidden">
          <ScoreRadar dimensions={dimensions} className="mx-auto" />
        </div>
      )}
    </section>
  );
}
