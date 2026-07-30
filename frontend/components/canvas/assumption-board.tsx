"use client";

import { ChevronDown, FlaskConical, ShieldQuestion } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CanvasSection } from "@/components/canvas/canvas-section";
import type {
  AssumptionStatus,
  CanvasAssumption,
  CanvasExperiment,
} from "@/lib/report-canvas";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: AssumptionStatus; label: string }[] = [
  { value: "untested", label: "Untested" },
  { value: "testing", label: "Testing" },
  { value: "supported", label: "Supported" },
  { value: "contradicted", label: "Contradicted" },
  { value: "inconclusive", label: "Inconclusive" },
];

const STATUS_STYLES: Record<
  AssumptionStatus,
  { chip: string; rail: string; wash: string }
> = {
  untested: {
    chip: "border-border-strong bg-muted text-muted-foreground",
    rail: "bg-border-strong",
    wash: "bg-background",
  },
  testing: {
    chip: "border-brand/30 bg-brand-muted text-brand",
    rail: "bg-brand",
    wash: "bg-brand-muted/25",
  },
  supported: {
    chip: "border-success/30 bg-success-muted text-success",
    rail: "bg-success",
    wash: "bg-success-muted/30",
  },
  contradicted: {
    chip: "border-destructive/30 bg-destructive-muted text-destructive",
    rail: "bg-destructive",
    wash: "bg-destructive-muted/30",
  },
  inconclusive: {
    chip: "border-warning/30 bg-warning-muted text-warning",
    rail: "bg-warning",
    wash: "bg-warning-muted/30",
  },
};

export function AssumptionBoard({
  assumptions,
  experiments,
  statuses,
  index,
  onStatusChange,
  onOpenExperiment,
}: {
  assumptions: CanvasAssumption[];
  experiments: CanvasExperiment[];
  statuses: Record<string, AssumptionStatus>;
  index: number;
  onStatusChange: (id: string, status: AssumptionStatus) => void;
  onOpenExperiment?: (experimentId: string) => void;
}) {
  if (assumptions.length === 0) return null;

  const experimentsById = new Map(
    experiments.map((experiment) => [experiment.id, experiment]),
  );

  const counts = STATUS_OPTIONS.map((option) => ({
    ...option,
    count: assumptions.filter(
      (assumption) => (statuses[assumption.id] ?? "untested") === option.value,
    ).length,
  })).filter((entry) => entry.count > 0);

  return (
    <CanvasSection
      id="assumptions"
      index={index}
      icon={ShieldQuestion}
      eyebrow="Riskiest assumptions"
      title="What has to be true"
      description="Research cannot settle these — only customers can. Set a status as you learn."
      action={
        <div className="flex flex-wrap gap-1.5">
          {counts.map((entry) => (
            <span
              key={entry.value}
              className={cn(
                "rounded-full border px-2 py-0.5 font-mono text-[10px]",
                STATUS_STYLES[entry.value].chip,
              )}
            >
              {entry.count} {entry.label.toLowerCase()}
            </span>
          ))}
        </div>
      }
    >
      <ul className="space-y-2.5">
        {assumptions.map((assumption) => {
          const status = statuses[assumption.id] ?? "untested";
          const styles = STATUS_STYLES[status];
          const linked = assumption.experimentId
            ? experimentsById.get(assumption.experimentId)
            : undefined;

          return (
            <li
              key={assumption.id}
              className={cn(
                "relative overflow-hidden rounded-xl border border-border transition-colors",
                styles.wash,
              )}
            >
              <span
                aria-hidden="true"
                className={cn("absolute inset-y-0 left-0 w-1", styles.rail)}
              />
              <Collapsible className="group">
                <div className="flex flex-col gap-3 p-4 pl-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[9.5px] tracking-[0.12em] text-brand uppercase">
                        {assumption.kind === "risk"
                          ? "Risk to disprove"
                          : "Investor objection"}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-1.5 py-0.5 font-mono text-[9px] tracking-wide uppercase",
                          styles.chip,
                        )}
                      >
                        {status}
                      </span>
                    </div>
                    <p className="mt-2 text-[14px] leading-snug font-medium text-foreground [overflow-wrap:anywhere]">
                      {assumption.title}
                    </p>
                    {assumption.why && (
                      <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
                        {assumption.why}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <label className="sr-only" htmlFor={`status-${assumption.id}`}>
                      Status for {assumption.title}
                    </label>
                    <select
                      id={`status-${assumption.id}`}
                      value={status}
                      onChange={(event) =>
                        onStatusChange(
                          assumption.id,
                          event.target.value as AssumptionStatus,
                        )
                      }
                      className="h-9 rounded-lg border border-border bg-card px-2.5 text-[12.5px] text-foreground shadow-xs transition-colors hover:border-brand/50 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Show details for ${assumption.title}`}
                        className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground shadow-xs transition-colors hover:text-foreground"
                      >
                        <ChevronDown
                          size={15}
                          className="transition-transform group-data-[state=open]:rotate-180"
                        />
                      </button>
                    </CollapsibleTrigger>
                  </div>
                </div>

                <CollapsibleContent>
                  <dl className="space-y-3 border-t border-border/70 px-4 py-4 pl-5">
                    {assumption.why && (
                      <DetailRow label="Why it matters" value={assumption.why} />
                    )}
                    {assumption.evidence && (
                      <DetailRow label="Evidence found" value={assumption.evidence} />
                    )}
                    {assumption.response && (
                      <DetailRow
                        label={
                          assumption.kind === "risk"
                            ? "Suggested mitigation"
                            : "Best answer"
                        }
                        value={assumption.response}
                      />
                    )}
                    {linked && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => onOpenExperiment?.(linked.id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-brand/40 bg-brand-muted px-3 py-2 text-[12.5px] font-medium text-brand transition-colors hover:border-brand"
                        >
                          <FlaskConical size={13} />
                          Test with: {linked.name}
                        </button>
                      </div>
                    )}
                  </dl>
                </CollapsibleContent>
              </Collapsible>
            </li>
          );
        })}
      </ul>
    </CanvasSection>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[148px_1fr] sm:gap-4">
      <dt className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase sm:pt-0.5">
        {label}
      </dt>
      <dd className="text-[12.5px] leading-relaxed text-foreground/80 [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}
