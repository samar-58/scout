"use client";

import { CanvasSection } from "@/components/canvas/canvas-section";
import type { CanvasExperiment } from "@/lib/report-canvas";
import { cn } from "@/lib/utils";

export type ExperimentStatus = "suggested" | "planned" | "running" | "done";

const STAGES: { value: ExperimentStatus; label: string }[] = [
  { value: "suggested", label: "Suggested" },
  { value: "planned", label: "Planned" },
  { value: "running", label: "Running" },
  { value: "done", label: "Done" },
];

/**
 * A four-stage segmented control rather than a dropdown. Advancing an experiment
 * is the main action on this board, so it should be one tap and the current
 * stage should be visible without opening anything.
 */
function StageControl({
  experimentId,
  name,
  status,
  onChange,
}: {
  experimentId: string;
  name: string;
  status: ExperimentStatus;
  onChange: (status: ExperimentStatus) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={`Stage for ${name}`}
      className="inline-flex rounded-md border border-border p-0.5"
    >
      {STAGES.map((stage) => {
        const active = stage.value === status;
        return (
          <button
            key={stage.value}
            type="button"
            role="radio"
            aria-checked={active}
            id={`${experimentId}-${stage.value}`}
            onClick={() => onChange(stage.value)}
            className={cn(
              "rounded-[5px] px-2 py-1 text-[11.5px] whitespace-nowrap transition-colors",
              active
                ? "bg-foreground font-medium text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {stage.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The experiment pipeline.
 *
 * Cards became rows: a numbered tile, a stage accent bar, a bordered method
 * block and two tinted criterion cells per experiment added up to a wall of
 * boxes. Success and failure lines are the substance, so they get the space, and
 * cost/time sit as plain metadata.
 */
export function ExperimentBoard({
  experiments,
  statuses,
  focusedId,
  onStatusChange,
}: {
  experiments: CanvasExperiment[];
  statuses: Record<string, ExperimentStatus>;
  focusedId?: string;
  onStatusChange: (id: string, status: ExperimentStatus) => void;
}) {
  if (experiments.length === 0) return null;

  return (
    <CanvasSection
      id="experiments"
      eyebrow="Experiments"
      title="How to find out cheaply"
      description="Every test states what success looks like and what would kill it, so the result is a decision rather than an opinion."
    >
      <ol className="divide-y divide-border border-y border-border">
        {experiments.map((experiment) => {
          const status = statuses[experiment.id] ?? "suggested";
          const focused = focusedId === experiment.id;

          return (
            <li
              key={experiment.id}
              id={experiment.id}
              className={cn(
                "scroll-mt-24 py-4 transition-colors",
                focused && "bg-muted/60",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                <div className="min-w-0 flex-1">
                  <h4 className="text-[13.5px] leading-snug font-medium [overflow-wrap:anywhere]">
                    {experiment.name}
                  </h4>
                  {experiment.goal && (
                    <p className="mt-1 text-[13px] leading-relaxed text-foreground/75">
                      {experiment.goal}
                    </p>
                  )}
                </div>
                <StageControl
                  experimentId={experiment.id}
                  name={experiment.name}
                  status={status}
                  onChange={(next) => onStatusChange(experiment.id, next)}
                />
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
          );
        })}
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
