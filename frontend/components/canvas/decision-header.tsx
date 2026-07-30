"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CanvasDecision, DecisionTone } from "@/lib/report-canvas";
import { cn } from "@/lib/utils";

const TONE_STYLES: Record<DecisionTone, { pill: string; rule: string }> = {
  proceed: { pill: "border-success/30 bg-success/10 text-success", rule: "bg-success" },
  narrow: { pill: "border-brand/30 bg-brand-muted text-brand", rule: "bg-brand" },
  investigate: {
    pill: "border-warning/30 bg-warning/10 text-warning",
    rule: "bg-warning",
  },
  reconsider: {
    pill: "border-destructive/30 bg-destructive/10 text-destructive",
    rule: "bg-destructive",
  },
};

export function DecisionHeader({
  decision,
  onStartExperiments,
}: {
  decision: CanvasDecision;
  onStartExperiments?: () => void;
}) {
  const tone = TONE_STYLES[decision.tone];

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className={cn("h-1 w-full", tone.rule)} aria-hidden="true" />
      <div className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-semibold tracking-[0.16em] text-brand uppercase">
              Scout recommendation
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <h2 className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">
                {decision.label}
              </h2>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] uppercase",
                  tone.pill,
                )}
              >
                {decision.overall}/100
              </span>
              {typeof decision.confidence === "number" && (
                <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {decision.confidence}% confidence
                </span>
              )}
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/75">
              {decision.summary}
            </p>
          </div>

          {onStartExperiments && (
            <Button
              type="button"
              onClick={onStartExperiments}
              className="h-10 shrink-0 gap-1.5 self-start"
            >
              Plan the experiments
              <ArrowRight size={14} />
            </Button>
          )}
        </div>

        {decision.changeConditions.length > 0 && (
          <div className="mt-5 rounded-lg border border-border bg-secondary/40 p-3.5 sm:p-4">
            <h3 className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              What would change this recommendation
            </h3>
            <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
              {decision.changeConditions.map((condition) => (
                <li
                  key={condition}
                  className="flex gap-2 text-[13px] leading-relaxed text-foreground/75"
                >
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand" />
                  {condition}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
