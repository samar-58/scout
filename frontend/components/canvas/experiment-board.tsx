"use client";

import { ArrowRight } from "lucide-react";
import { CanvasSection } from "@/components/canvas/canvas-section";
import { Button } from "@/components/ui/button";
import type { CanvasExperiment } from "@/lib/report-canvas";
import { cn } from "@/lib/utils";

/**
 * Report-suggested experiments, read-only.
 *
 * Lifecycle and observations live on Validate. This board only shows what the
 * research run proposed so the founder can jump into the living loop.
 */
export function ExperimentBoard({
  experiments,
  onOpenValidate,
}: {
  experiments: CanvasExperiment[];
  onOpenValidate?: () => void;
}) {
  if (experiments.length === 0) return null;

  return (
    <CanvasSection
      id="experiments"
      eyebrow="Experiments"
      title="How to find out cheaply"
      description="Every test states what success looks like and what would kill it. Track and run them on the Validate tab."
      action={
        onOpenValidate ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={onOpenValidate}
          >
            Open Validate
            <ArrowRight size={13} />
          </Button>
        ) : undefined
      }
    >
      <ol className="divide-y divide-border border-y border-border">
        {experiments.map((experiment) => (
          <li key={experiment.id} id={experiment.id} className="scroll-mt-24 py-4">
            <div className="min-w-0">
              <h4 className="text-[13.5px] leading-snug font-medium [overflow-wrap:anywhere]">
                {experiment.name}
              </h4>
              {experiment.goal && (
                <p className="mt-1 text-[13px] leading-relaxed text-foreground/75">
                  {experiment.goal}
                </p>
              )}
            </div>

            {experiment.method && (
              <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
                {experiment.method}
              </p>
            )}

            {(experiment.successCriteria || experiment.failureCriteria) && (
              <dl className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                {experiment.successCriteria && (
                  <Criterion
                    dot="bg-success"
                    label="Success"
                    value={experiment.successCriteria}
                  />
                )}
                {experiment.failureCriteria && (
                  <Criterion
                    dot="bg-destructive"
                    label="Failure"
                    value={experiment.failureCriteria}
                  />
                )}
              </dl>
            )}

            {(experiment.time || experiment.cost) && (
              <p className="mt-2.5 text-[12px] text-subtle-foreground">
                {[experiment.time, experiment.cost].filter(Boolean).join(" · ")}
              </p>
            )}
          </li>
        ))}
      </ol>
    </CanvasSection>
  );
}

function Criterion({
  dot,
  label,
  value,
}: {
  dot: string;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-baseline gap-1.5 text-[12px] text-muted-foreground">
        <span aria-hidden className={cn("size-1.5 rounded-full", dot)} />
        {label}
      </dt>
      <dd className="mt-0.5 pl-3.5 text-[13px] leading-relaxed text-foreground/85 [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}
