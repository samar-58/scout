"use client";

import { Check, ChevronDown, Pencil, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ASSUMPTION_STATUS_META, categoryLabel } from "@/lib/loop-meta";
import type {
  AssumptionRecord,
  AssumptionStatusValue,
  ExperimentRecord,
} from "@/lib/scout-api";
import { cn } from "@/lib/utils";

const STATUS_ORDER: AssumptionStatusValue[] = [
  "untested",
  "testing",
  "supported",
  "contradicted",
  "inconclusive",
];

/**
 * The assumptions, as persisted records the founder owns.
 *
 * Scout proposes each one; the founder accepts, rewrites, or rejects it. An edit
 * keeps Scout's original wording in provenance server-side, so the history of a
 * changed assumption is never lost.
 */
export function AssumptionList({
  assumptions,
  experiments,
  selectedIds,
  onToggleSelect,
  onReview,
  busy,
  highlightCategory,
}: {
  assumptions: AssumptionRecord[];
  experiments: ExperimentRecord[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onReview: (
    id: string,
    review: {
      statement?: string;
      review_state?: AssumptionRecord["review_state"];
      status?: AssumptionStatusValue;
    },
  ) => void;
  busy?: string;
  highlightCategory?: string;
}) {
  const [editingId, setEditingId] = useState<string>();
  const [draft, setDraft] = useState("");

  if (assumptions.length === 0) {
    return (
      <p className="border-y border-border py-6 text-[13px] text-muted-foreground">
        Assumptions appear here once a research run completes.
      </p>
    );
  }

  const experimentsByAssumption = new Map<string, ExperimentRecord[]>();
  for (const experiment of experiments) {
    for (const link of experiment.assumptions) {
      experimentsByAssumption.set(link.id, [
        ...(experimentsByAssumption.get(link.id) ?? []),
        experiment,
      ]);
    }
  }

  return (
    <ul className="divide-y divide-border border-y border-border">
      {assumptions.map((assumption) => {
        const meta = ASSUMPTION_STATUS_META[assumption.status];
        const rejected = assumption.review_state === "rejected";
        const linked = experimentsByAssumption.get(assumption.id) ?? [];
        const isBusy = busy === `assumption:${assumption.id}`;
        const selectable = !rejected && assumption.status !== "supported";

        return (
          <li
            key={assumption.id}
            className={cn(
              rejected && "opacity-55",
              highlightCategory &&
                assumption.category === highlightCategory &&
                "bg-muted/50",
            )}
          >
            <Collapsible className="group">
              <div className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <label
                    className={cn(
                      "mt-0.5 flex items-center gap-2",
                      !selectable && "invisible",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(assumption.id)}
                      onChange={() => onToggleSelect(assumption.id)}
                      disabled={!selectable}
                      className="size-3.5 accent-[var(--brand)]"
                      aria-label={`Include "${assumption.statement}" in the next sprint`}
                    />
                  </label>

                  <div className="min-w-0 flex-1">
                    {editingId === assumption.id ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={draft}
                          rows={2}
                          onChange={(event) => setDraft(event.target.value)}
                          aria-label="Assumption statement"
                          className="w-full resize-none rounded-md border border-border bg-card px-2.5 py-2 text-[13.5px] leading-snug focus:border-border-strong focus:outline-none"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="h-7"
                            disabled={!draft.trim() || isBusy}
                            onClick={() => {
                              onReview(assumption.id, { statement: draft.trim() });
                              setEditingId(undefined);
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7"
                            onClick={() => setEditingId(undefined)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-2">
                          <span
                            aria-hidden
                            className={cn(
                              "size-1.5 shrink-0 translate-y-[-2px] rounded-full",
                              meta.dot,
                            )}
                          />
                          <p className="min-w-0 text-[13.5px] leading-snug font-medium [overflow-wrap:anywhere]">
                            {assumption.statement}
                          </p>
                        </div>
                        <p className="mt-1 pl-3.5 text-[12px] text-muted-foreground">
                          #{assumption.risk_rank} ·{" "}
                          {categoryLabel(assumption.category)} ·{" "}
                          <span className={meta.text}>{meta.label}</span>
                          {assumption.review_state !== "proposed" && (
                            <> · {assumption.review_state}</>
                          )}
                          {linked.length > 0 && (
                            <> · {linked.length} experiment{linked.length === 1 ? "" : "s"}</>
                          )}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Accept "${assumption.statement}"`}
                    disabled={isBusy || assumption.review_state === "accepted"}
                    onClick={() =>
                      onReview(assumption.id, { review_state: "accepted" })
                    }
                  >
                    <Check className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Edit "${assumption.statement}"`}
                    disabled={isBusy}
                    onClick={() => {
                      setEditingId(assumption.id);
                      setDraft(assumption.statement);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Reject "${assumption.statement}"`}
                    disabled={isBusy || rejected}
                    onClick={() =>
                      onReview(assumption.id, { review_state: "rejected" })
                    }
                  >
                    <X className="size-3.5" />
                  </Button>
                  <label className="sr-only" htmlFor={`status-${assumption.id}`}>
                    Status for {assumption.statement}
                  </label>
                  <select
                    id={`status-${assumption.id}`}
                    value={assumption.status}
                    disabled={isBusy}
                    onChange={(event) =>
                      onReview(assumption.id, {
                        status: event.target.value as AssumptionStatusValue,
                      })
                    }
                    className="h-8 rounded-md border border-border bg-card px-2 text-[12.5px] focus:border-border-strong focus:outline-none"
                  >
                    {STATUS_ORDER.map((status) => (
                      <option key={status} value={status}>
                        {ASSUMPTION_STATUS_META[status].label}
                      </option>
                    ))}
                  </select>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Show details for "${assumption.statement}"`}
                    >
                      <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>

              <CollapsibleContent className="overflow-hidden">
                <dl className="grid gap-3 pb-4 pl-6.5 text-[13px] sm:grid-cols-2">
                  {assumption.why_it_matters && (
                    <div>
                      <dt className="label pb-1">Why it matters</dt>
                      <dd className="leading-relaxed text-muted-foreground">
                        {assumption.why_it_matters}
                      </dd>
                    </div>
                  )}
                  {assumption.suggested_response && (
                    <div>
                      <dt className="label pb-1">Scout's suggested response</dt>
                      <dd className="leading-relaxed text-muted-foreground">
                        {assumption.suggested_response}
                      </dd>
                    </div>
                  )}
                  {linked.length > 0 && (
                    <div className="sm:col-span-2">
                      <dt className="label pb-1">Testing this</dt>
                      <dd className="leading-relaxed text-muted-foreground">
                        {linked.map((experiment) => experiment.name).join(" · ")}
                      </dd>
                    </div>
                  )}
                </dl>
              </CollapsibleContent>
            </Collapsible>
          </li>
        );
      })}
    </ul>
  );
}
