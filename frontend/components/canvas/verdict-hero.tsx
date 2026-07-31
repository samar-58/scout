"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import { ScoreRadar } from "@/components/canvas/score-radar";
import { VerdictGauge } from "@/components/canvas/verdict-gauge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import type { CanvasDecision, CanvasDimension } from "@/lib/report-canvas";

/**
 * The verdict.
 *
 * The recommendation, the dial, and what would change it. What went: a tone-keyed
 * gradient rule, a radial colour bloom, a grid overlay, a duplicate verdict pill
 * next to the dial, and a tinted sub-panel. The dial is the only place colour
 * appears, because there it encodes the band.
 */
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
  return (
    <section className="panel p-5 sm:p-7">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12">
        <div className="min-w-0">
          <p className="label">Recommendation</p>
          <h2 className="mt-2 font-serif text-[1.75rem] leading-[1.1] font-semibold text-balance sm:text-[2.125rem]">
            {decision.label}
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed text-foreground/80">
            {decision.summary}
          </p>

          {/* Mobile: the dial sits inline, once. */}
          <div className="mt-6 lg:hidden">
            <VerdictGauge
              value={decision.overall}
              tone={decision.tone}
              confidence={decision.confidence}
            />
          </div>

          {decision.changeConditions.length > 0 && (
            <div className="mt-7">
              <h3 className="label">What would change this</h3>
              <ul className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                {decision.changeConditions.map((condition, index) => (
                  <li
                    key={condition}
                    className="flex gap-2.5 text-[13px] leading-relaxed text-foreground/80"
                  >
                    <span className="tabular-nums text-subtle-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {condition}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            {onStartExperiments && (
              <Button type="button" size="sm" onClick={onStartExperiments} className="gap-1.5">
                Plan the experiments
                <ArrowRight size={13} />
              </Button>
            )}
            {scoreExplanation && (
              <Collapsible className="group w-full sm:w-auto">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    How the score was built
                    <ChevronDown
                      size={13}
                      className="transition-transform group-data-[state=open]:rotate-180"
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="mt-3 max-w-xl border-l-2 border-border pl-3.5 text-[13px] leading-relaxed text-muted-foreground">
                    {scoreExplanation}
                  </p>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>

        {/* Desktop: dial above the radar in its own column. */}
        <div className="hidden shrink-0 flex-col items-center gap-4 lg:flex">
          <VerdictGauge
            value={decision.overall}
            tone={decision.tone}
            confidence={decision.confidence}
          />
          {dimensions.length > 0 && (
            <ScoreRadar dimensions={dimensions} className="w-[280px]" />
          )}
        </div>
      </div>

      {dimensions.length > 0 && (
        <div className="mt-7 border-t border-border pt-6 lg:hidden">
          <ScoreRadar dimensions={dimensions} className="mx-auto" />
        </div>
      )}
    </section>
  );
}
