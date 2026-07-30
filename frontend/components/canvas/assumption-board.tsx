"use client";

import { ChevronDown, FlaskConical } from "lucide-react";
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

const STATUS_STYLES: Record<AssumptionStatus, string> = {
  untested: "border-border bg-muted text-muted-foreground",
  testing: "border-brand/30 bg-brand-muted text-brand",
  supported: "border-success/30 bg-success/10 text-success",
  contradicted: "border-destructive/30 bg-destructive/10 text-destructive",
  inconclusive: "border-warning/30 bg-warning/10 text-warning",
};

export function AssumptionBoard({
  assumptions,
  experiments,
  statuses,
  onStatusChange,
  onOpenExperiment,
}: {
  assumptions: CanvasAssumption[];
  experiments: CanvasExperiment[];
  statuses: Record<string, AssumptionStatus>;
  onStatusChange: (id: string, status: AssumptionStatus) => void;
  onOpenExperiment?: (experimentId: string) => void;
}) {
  if (assumptions.length === 0) return null;

  const experimentsById = new Map(
    experiments.map((experiment) => [experiment.id, experiment]),
  );
  const untested = assumptions.filter(
    (assumption) => (statuses[assumption.id] ?? "untested") === "untested",
  ).length;

  return (
    <CanvasSection
      id="assumptions"
      eyebrow="Riskiest assumptions"
      title="What has to be true"
      description="Research cannot settle these — only customers can. Set a status as you learn."
      action={
        <span className="rounded-full border border-border px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
          {untested} untested
        </span>
      }
    >
      <ul className="space-y-2.5">
        {assumptions.map((assumption) => {
          const status = statuses[assumption.id] ?? "untested";
          const linked = assumption.experimentId
            ? experimentsById.get(assumption.experimentId)
            : undefined;

          return (
            <li
              key={assumption.id}
              className="rounded-lg border border-border bg-background"
            >
              <Collapsible className="group">
                <div className="flex flex-col gap-2.5 p-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[10px] tracking-wide text-brand uppercase">
                        {assumption.kind === "risk" ? "Risk" : "Objection"}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-1.5 py-0.5 font-mono text-[9px] tracking-wide uppercase",
                          STATUS_STYLES[status],
                        )}
                      >
                        {status}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13.5px] leading-snug font-medium text-foreground [overflow-wrap:anywhere]">
                      {assumption.title}
                    </p>
                    {assumption.why && (
                      <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
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
                      className="h-8 rounded-md border border-border bg-card px-2 text-[12px] text-foreground transition-colors hover:border-brand/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
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
                        className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <ChevronDown
                          size={14}
                          className="transition-transform group-data-[state=open]:rotate-180"
                        />
                      </button>
                    </CollapsibleTrigger>
                  </div>
                </div>

                <CollapsibleContent>
                  <dl className="space-y-2.5 border-t border-border px-3.5 py-3.5">
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
                          className="inline-flex items-center gap-1.5 rounded-md border border-brand/30 bg-brand-muted px-2.5 py-1.5 text-[12px] font-medium text-brand transition-colors hover:border-brand/60"
                        >
                          <FlaskConical size={12} />
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
    <div className="grid gap-0.5 sm:grid-cols-[140px_1fr] sm:gap-3">
      <dt className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase sm:pt-0.5">
        {label}
      </dt>
      <dd className="text-[12.5px] leading-relaxed text-foreground/80 [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}
