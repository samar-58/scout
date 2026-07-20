"use client";

import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ScoreDimension, ScoreEvent } from "@/lib/types";

const DIMENSION_LABELS: Record<string, string> = {
  market: "Market",
  competition: "Competition",
  distribution: "Distribution",
  execution: "Execution",
  timing: "Timing",
  monetization: "Monetization",
};

function scoreTone(score: number) {
  if (score >= 7) return "bg-success";
  if (score >= 4) return "bg-warning";
  return "bg-destructive";
}

function verdictLabel(overall: number) {
  if (overall >= 70) return "Strong";
  if (overall >= 50) return "Promising";
  if (overall >= 35) return "Mixed";
  return "Weak";
}

export function ScoreBreakdown({ score }: { score: ScoreEvent }) {
  const dimensions = Object.entries(DIMENSION_LABELS).map(([key, label]) => ({
    key,
    label,
    value: score.scores[key as keyof typeof score.scores] as ScoreDimension,
  }));

  const hasRationale = dimensions.some((d) => d.value?.rationale);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-secondary/40">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-5">
        <div className="min-w-0">
          <span className="text-[10px] font-semibold tracking-[0.16em] text-brand uppercase">
            Scout verdict
          </span>
          <h3 className="font-serif text-[15px] font-semibold leading-snug sm:text-base">
            {verdictLabel(score.scores.overall)} · scored across six dimensions
          </h3>
        </div>
        <div className="flex shrink-0 items-baseline">
          <strong className="font-serif text-[2.25rem] leading-none font-semibold tabular-nums sm:text-[2.5rem]">
            {score.scores.overall}
          </strong>
          <span className="ml-1 font-mono text-[11px] text-muted-foreground">
            /100
          </span>
        </div>
      </div>

      <div className="space-y-2.5 px-4 py-4 sm:px-5">
        {dimensions.map(({ key, label, value }) => (
          <div key={key} className="grid grid-cols-[84px_1fr_32px] items-center gap-3 sm:grid-cols-[104px_1fr_32px]">
            <span className="text-[12px] font-medium text-foreground/80">
              {label}
            </span>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", scoreTone(value.score))}
                style={{ width: `${(value.score / 10) * 100}%` }}
              />
            </div>
            <span className="text-right font-mono text-[11px] tabular-nums text-muted-foreground">
              {value.score}
              <span className="text-muted-foreground/50">/10</span>
            </span>
          </div>
        ))}
      </div>

      {hasRationale && (
        <Collapsible className="group border-t border-border">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-muted-foreground transition-colors hover:text-foreground sm:px-5"
            >
              Why each dimension scored this way
              <ChevronDown
                size={14}
                className="shrink-0 transition-transform group-data-[state=open]:rotate-180"
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <dl className="space-y-3 border-t border-border px-4 py-4 sm:px-5">
              {dimensions
                .filter((d) => d.value?.rationale)
                .map(({ key, label, value }) => (
                  <div key={key} className="grid gap-1 sm:grid-cols-[104px_1fr] sm:gap-3">
                    <dt className="flex items-baseline gap-1.5">
                      <span className="text-[12px] font-semibold text-foreground">
                        {label}
                      </span>
                      <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                        {value.score}/10
                      </span>
                    </dt>
                    <dd className="text-[12px] leading-relaxed text-foreground/70">
                      {value.rationale}
                    </dd>
                  </div>
                ))}
            </dl>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
