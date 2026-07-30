"use client";

import { Check, OctagonX, TriangleAlert } from "lucide-react";
import { LivePulse } from "@/components/live-pulse";
import { RUN_STEPS, formatElapsed, type RunPhase } from "@/lib/run-phase";
import { cn } from "@/lib/utils";

export type RunOutcomeState = "running" | "done" | "cancelled" | "error";

function StateOrb({ outcome }: { outcome: RunOutcomeState }) {
  const shell =
    "grid h-10 w-10 shrink-0 place-items-center rounded-full border bg-card";
  if (outcome === "running") {
    return (
      <span className={cn(shell, "border-border")}>
        <LivePulse size={12} />
      </span>
    );
  }
  if (outcome === "done") {
    return (
      <span className={cn(shell, "border-success/40 text-success")}>
        <Check size={17} strokeWidth={2.5} />
      </span>
    );
  }
  if (outcome === "cancelled") {
    return (
      <span className={cn(shell, "border-warning/40 text-warning")}>
        <OctagonX size={16} />
      </span>
    );
  }
  return (
    <span className={cn(shell, "border-destructive/40 text-destructive")}>
      <TriangleAlert size={16} />
    </span>
  );
}

function PhaseStepper({
  stepIndex,
  outcome,
}: {
  stepIndex: number;
  outcome: RunOutcomeState;
}) {
  const stalled = outcome === "cancelled" || outcome === "error";

  return (
    <ol className="grid grid-cols-4 gap-1.5" aria-label="Research stages">
      {RUN_STEPS.map((step, index) => {
        const isDone = index < stepIndex;
        const isCurrent = index === stepIndex && !stalled;
        return (
          <li key={step} className="min-w-0">
            <span
              aria-hidden="true"
              className={cn(
                "block h-1 rounded-full transition-colors duration-500",
                isDone && "bg-brand",
                isCurrent && "bg-brand/45",
                !isDone && !isCurrent && "bg-muted",
                stalled && index === stepIndex && "bg-muted-foreground/30",
              )}
            />
            <span
              className={cn(
                "mt-1.5 block truncate text-[10.5px] tracking-wide transition-colors",
                isDone || isCurrent
                  ? "font-medium text-foreground/80"
                  : "text-muted-foreground/60",
              )}
            >
              {step}
            </span>
            <span className="sr-only">
              {isDone ? "complete" : isCurrent ? "in progress" : "pending"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ProgressMeter({
  label,
  done,
  total,
}: {
  label: string;
  done: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:w-20">
        <div
          className="h-full rounded-full bg-brand transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right font-mono text-[10px] font-semibold tabular-nums">
        {done}/{total}
      </span>
    </div>
  );
}

const TITLES: Record<RunOutcomeState, string> = {
  running: "",
  done: "Research complete",
  cancelled: "Research stopped",
  error: "Research failed",
};

export function RunHeader({
  phase,
  outcome,
  elapsedMs,
  agentsDone,
  agentTotal,
  searchesDone,
  searchTotal,
}: {
  phase: RunPhase;
  outcome: RunOutcomeState;
  elapsedMs: number;
  agentsDone: number;
  agentTotal: number;
  searchesDone: number;
  searchTotal: number;
}) {
  const title = outcome === "running" ? phase.label : TITLES[outcome];
  const detail =
    outcome === "cancelled"
      ? "You stopped this run. Nothing was saved."
      : outcome === "error"
        ? "The run ended before a report could be produced."
        : phase.detail;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <StateOrb outcome={outcome} />
          <div className="min-w-0">
            {/*
              Announce phase changes to screen readers without stealing focus.
              The stream is the only source of progress, so this is the one
              place that narrates it.
            */}
            <h1
              aria-live="polite"
              className="font-serif text-[17px] leading-snug font-semibold tracking-tight sm:text-xl"
            >
              {title}
            </h1>
            <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">
              {detail}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
          <span
            className="font-mono text-[11px] tabular-nums text-muted-foreground"
            title="Elapsed time"
          >
            {formatElapsed(elapsedMs)}
          </span>
          <ProgressMeter label="search" done={searchesDone} total={searchTotal} />
          <ProgressMeter label="agents" done={agentsDone} total={agentTotal} />
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-3.5">
        <PhaseStepper stepIndex={phase.stepIndex} outcome={outcome} />
      </div>
    </div>
  );
}
