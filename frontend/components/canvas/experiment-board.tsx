"use client";

import { Clock, Coins, Target, XCircle } from "lucide-react";
import { CanvasSection } from "@/components/canvas/canvas-section";
import type { CanvasExperiment } from "@/lib/report-canvas";
import { cn } from "@/lib/utils";

export type ExperimentStatus = "suggested" | "planned" | "running" | "done";

const STATUS_OPTIONS: { value: ExperimentStatus; label: string }[] = [
  { value: "suggested", label: "Suggested" },
  { value: "planned", label: "Planned" },
  { value: "running", label: "Running" },
  { value: "done", label: "Done" },
];

const STATUS_STYLES: Record<ExperimentStatus, string> = {
  suggested: "border-border bg-muted text-muted-foreground",
  planned: "border-brand/30 bg-brand-muted text-brand",
  running: "border-warning/30 bg-warning/10 text-warning",
  done: "border-success/30 bg-success/10 text-success",
};

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

  const counts = STATUS_OPTIONS.map((option) => ({
    ...option,
    count: experiments.filter(
      (experiment) => (statuses[experiment.id] ?? "suggested") === option.value,
    ).length,
  }));

  return (
    <CanvasSection
      id="experiments"
      eyebrow="Experiment pipeline"
      title="How to find out cheaply"
      description="Each experiment has a success and failure line, so the result is a decision rather than an opinion."
      action={
        <div className="flex flex-wrap gap-1.5">
          {counts.map((entry) => (
            <span
              key={entry.value}
              className={cn(
                "rounded-full border px-2 py-0.5 font-mono text-[10px]",
                entry.count > 0
                  ? STATUS_STYLES[entry.value]
                  : "border-border text-muted-foreground/60",
              )}
            >
              {entry.count} {entry.label.toLowerCase()}
            </span>
          ))}
        </div>
      }
    >
      <ol className="grid gap-3 lg:grid-cols-2">
        {experiments.map((experiment, index) => {
          const status = statuses[experiment.id] ?? "suggested";
          const isFocused = focusedId === experiment.id;

          return (
            <li
              key={experiment.id}
              id={experiment.id}
              className={cn(
                "flex flex-col rounded-lg border bg-background p-3.5 transition-colors scroll-mt-24",
                isFocused
                  ? "border-brand ring-[3px] ring-brand/20"
                  : "border-border hover:border-brand/40",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-mono text-[10px] text-brand">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h4 className="mt-0.5 text-[13.5px] leading-snug font-medium text-foreground [overflow-wrap:anywhere]">
                    {experiment.name}
                  </h4>
                </div>
                <div className="shrink-0">
                  <label className="sr-only" htmlFor={`experiment-${experiment.id}`}>
                    Status for {experiment.name}
                  </label>
                  <select
                    id={`experiment-${experiment.id}`}
                    value={status}
                    onChange={(event) =>
                      onStatusChange(
                        experiment.id,
                        event.target.value as ExperimentStatus,
                      )
                    }
                    className="h-8 rounded-md border border-border bg-card px-2 text-[12px] text-foreground transition-colors hover:border-brand/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {experiment.goal && (
                <p className="mt-2 text-[12.5px] leading-relaxed text-foreground/75">
                  {experiment.goal}
                </p>
              )}
              {experiment.method && (
                <p className="mt-2 border-l-2 border-border pl-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  {experiment.method}
                </p>
              )}

              <dl className="mt-3 space-y-1.5">
                {experiment.successCriteria && (
                  <Criterion
                    icon={<Target size={12} className="text-success" />}
                    label="Success"
                    value={experiment.successCriteria}
                  />
                )}
                {experiment.failureCriteria && (
                  <Criterion
                    icon={<XCircle size={12} className="text-destructive" />}
                    label="Failure"
                    value={experiment.failureCriteria}
                  />
                )}
              </dl>

              {(experiment.time || experiment.cost) && (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-2.5 font-mono text-[11px] text-muted-foreground">
                  {experiment.time && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={11} />
                      {experiment.time}
                    </span>
                  )}
                  {experiment.cost && (
                    <span className="inline-flex items-center gap-1.5">
                      <Coins size={11} />
                      {experiment.cost}
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </CanvasSection>
  );
}

function Criterion({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-2">
      <span className="mt-[3px] shrink-0">{icon}</span>
      <div className="min-w-0">
        <dt className="sr-only">{label}</dt>
        <dd className="text-[12.5px] leading-relaxed text-foreground/80 [overflow-wrap:anywhere]">
          <span className="font-medium text-foreground">{label}: </span>
          {value}
        </dd>
      </div>
    </div>
  );
}
