"use client";

import { ChevronDown } from "lucide-react";
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

/** Status shows as a dot; the select next to it already spells out the word. */
const STATUS_DOT: Record<AssumptionStatus, string> = {
  untested: "bg-border-strong",
  testing: "bg-brand",
  supported: "bg-success",
  contradicted: "bg-destructive",
  inconclusive: "bg-warning",
};

/**
 * The assumptions still open, as rows.
 *
 * Each row previously had a coloured left rail, a tinted background wash, a
 * kind eyebrow in accent, a status pill *and* a status select — five signals for
 * two facts. Now: title, one dot, one select, and the detail behind a caret.
 */
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

  return (
    <CanvasSection
      id="assumptions"
      eyebrow="Assumptions"
      title="What has to be true"
      description="Research cannot settle these — only customers can. Set a status as you learn."
    >
      <ul className="divide-y divide-border border-y border-border">
        {assumptions.map((assumption) => {
          const status = statuses[assumption.id] ?? "untested";
          const linked = assumption.experimentId
            ? experimentsById.get(assumption.experimentId)
            : undefined;

          return (
            <li key={assumption.id}>
              <Collapsible className="group">
                <div className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span
                        aria-hidden
                        className={cn(
                          "size-1.5 shrink-0 translate-y-[-2px] rounded-full",
                          STATUS_DOT[status],
                        )}
                      />
                      <p className="min-w-0 text-[13.5px] leading-snug font-medium [overflow-wrap:anywhere]">
                        {assumption.title}
                      </p>
                    </div>
                    <p className="mt-1 pl-3.5 text-[12px] text-muted-foreground">
                      {assumption.kind === "risk"
                        ? "Risk to disprove"
                        : "Investor objection"}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
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
                      className="h-8 rounded-md border border-border bg-card px-2 text-[12.5px] focus:border-border-strong focus:outline-none"
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
                        className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
                  <dl className="space-y-2.5 pb-4 pl-3.5">
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
                      <button
                        type="button"
                        onClick={() => onOpenExperiment?.(linked.id)}
                        className="text-[12.5px] font-medium text-foreground underline underline-offset-4 transition-colors hover:text-brand"
                      >
                        Test with: {linked.name}
                      </button>
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
    <div className="grid gap-0.5 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className="text-[13px] leading-relaxed text-foreground/80 [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}
