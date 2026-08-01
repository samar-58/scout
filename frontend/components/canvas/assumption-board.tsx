"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CanvasSection } from "@/components/canvas/canvas-section";
import { Button } from "@/components/ui/button";
import type { CanvasAssumption, CanvasExperiment } from "@/lib/report-canvas";

const KIND_LABEL = {
  risk: "Risk to disprove",
  objection: "Investor objection",
} as const;

/**
 * The assumptions this report surfaced, as a read-only record.
 *
 * Status and review live on the project's Validate tab, where they are persisted
 * against first-class assumption records. This board deliberately has no controls:
 * a status set here would be a second source of truth for the same fact.
 */
export function AssumptionBoard({
  assumptions,
  experiments,
  onOpenValidate,
}: {
  assumptions: CanvasAssumption[];
  experiments: CanvasExperiment[];
  onOpenValidate?: (sectionId?: string) => void;
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
      description="Research cannot settle these — only customers can. Track and test them on the Validate tab."
      action={
        onOpenValidate ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => onOpenValidate("assumptions")}
          >
            Open Validate
            <ArrowRight size={13} />
          </Button>
        ) : undefined
      }
    >
      <ul className="divide-y divide-border border-y border-border">
        {assumptions.map((assumption) => {
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
                        className="size-1.5 shrink-0 translate-y-[-2px] rounded-full bg-border-strong"
                      />
                      <p className="min-w-0 text-[13.5px] leading-snug font-medium [overflow-wrap:anywhere]">
                        {assumption.title}
                      </p>
                    </div>
                    <p className="mt-1 pl-3.5 text-[12px] text-muted-foreground">
                      {KIND_LABEL[assumption.kind]}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
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
                        onClick={() => onOpenValidate?.("experiments")}
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
