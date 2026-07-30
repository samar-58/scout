"use client";

import { Clock, Coins, FlaskConical, Target, XCircle } from "lucide-react";
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

const STAGE_INDEX: Record<ExperimentStatus, number> = {
  suggested: 0,
  planned: 1,
  running: 2,
  done: 3,
};

const STAGE_ACCENT: Record<ExperimentStatus, string> = {
  suggested: "bg-border-strong",
  planned: "bg-brand",
  running: "bg-warning",
  done: "bg-success",
};

/**
 * A four-stage segmented control rather than a dropdown. Advancing an
 * experiment is the main action on this board, so it should be one tap and the
 * current stage should be visible without opening anything.
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
      className="inline-flex w-full rounded-lg border border-border bg-surface-sunken p-0.5 sm:w-auto"
    >
      {STAGES.map((stage) => {
        const active = stage.value === status;
        const passed = STAGE_INDEX[stage.value] < STAGE_INDEX[status];
        return (
          <button
            key={stage.value}
            type="button"
            role="radio"
            aria-checked={active}
            id={`${experimentId}-${stage.value}`}
            onClick={() => onChange(stage.value)}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-[11.5px] font-medium whitespace-nowrap transition-colors sm:flex-initial sm:px-2.5",
              active && "bg-card text-foreground shadow-xs",
              !active && passed && "text-foreground/55",
              !active && !passed && "text-muted-foreground hover:text-foreground",
            )}
          >
            {stage.label}
          </button>
        );
      })}
    </div>
  );
}

export function ExperimentBoard({
  experiments,
  statuses,
  focusedId,
  index,
  onStatusChange,
}: {
  experiments: CanvasExperiment[];
  statuses: Record<string, ExperimentStatus>;
  focusedId?: string;
  index: number;
  onStatusChange: (id: string, status: ExperimentStatus) => void;
}) {
  if (experiments.length === 0) return null;

  const doneCount = experiments.filter(
    (experiment) => (statuses[experiment.id] ?? "suggested") === "done",
  ).length;

  return (
    <CanvasSection
      id="experiments"
      index={index}
      icon={FlaskConical}
      eyebrow="Experiment pipeline"
      title="How to find out cheaply"
      description="Every test states what success looks like and what would kill it, so the result is a decision rather than an opinion."
      action={
        <span className="rounded-full border border-border px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
          {doneCount}/{experiments.length} done
        </span>
      }
    >
      <ol className="grid gap-3.5 xl:grid-cols-2">
        {experiments.map((experiment, position) => {
          const status = statuses[experiment.id] ?? "suggested";
          const isFocused = focusedId === experiment.id;

          return (
            <li
              key={experiment.id}
              id={experiment.id}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-xl border bg-background transition-all scroll-mt-28",
                isFocused
                  ? "border-brand ring-[3px] ring-brand/20"
                  : "border-border hover:border-brand/40 hover:shadow-md",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-0 top-0 h-0.5",
                  STAGE_ACCENT[status],
                )}
              />

              <div className="flex flex-col gap-3 p-4 pt-4.5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-surface-sunken font-mono text-[11px] font-semibold text-brand">
                    {position + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[14.5px] leading-snug font-semibold text-foreground [overflow-wrap:anywhere]">
                      {experiment.name}
                    </h4>
                    {experiment.goal && (
                      <p className="mt-1 text-[12.5px] leading-relaxed text-foreground/75">
                        {experiment.goal}
                      </p>
                    )}
                  </div>
                </div>

                <StageControl
                  experimentId={experiment.id}
                  name={experiment.name}
                  status={status}
                  onChange={(next) => onStatusChange(experiment.id, next)}
                />

                {experiment.method && (
                  <p className="rounded-lg border border-border bg-surface-sunken/70 p-3 text-[12.5px] leading-relaxed text-muted-foreground">
                    {experiment.method}
                  </p>
                )}

                {(experiment.successCriteria || experiment.failureCriteria) && (
                  <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
                    {experiment.successCriteria && (
                      <Criterion
                        tone="success"
                        icon={<Target size={12} />}
                        label="Success"
                        value={experiment.successCriteria}
                      />
                    )}
                    {experiment.failureCriteria && (
                      <Criterion
                        tone="destructive"
                        icon={<XCircle size={12} />}
                        label="Failure"
                        value={experiment.failureCriteria}
                      />
                    )}
                  </dl>
                )}
              </div>

              {(experiment.time || experiment.cost) && (
                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border bg-surface-sunken/50 px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
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
  tone,
  icon,
  label,
  value,
}: {
  tone: "success" | "destructive";
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className={cn(
        "p-3",
        tone === "success" ? "bg-success-muted/40" : "bg-destructive-muted/40",
      )}
    >
      <dt
        className={cn(
          "flex items-center gap-1.5 text-[9.5px] font-semibold tracking-[0.14em] uppercase",
          tone === "success" ? "text-success" : "text-destructive",
        )}
      >
        {icon}
        {label}
      </dt>
      <dd className="mt-1.5 text-[12.5px] leading-relaxed text-foreground/85 [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}
