"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LocalTime } from "@/components/local-time";
import {
  EXPERIMENT_ACTION_LABEL,
  EXPERIMENT_TRANSITIONS,
} from "@/lib/loop-meta";
import type {
  ExperimentRecord,
  ExperimentStatus,
  ObservationKind,
} from "@/lib/scout-api";
import { cn } from "@/lib/utils";

const OBSERVATION_KINDS: { value: ObservationKind; label: string }[] = [
  { value: "metric", label: "Metric" },
  { value: "quote", label: "Customer quote" },
  { value: "note", label: "Note" },
  { value: "surprise", label: "Surprise" },
  { value: "constraint", label: "Constraint" },
];

const RESULT_TONE: Record<string, string> = {
  supported: "text-success",
  contradicted: "text-destructive",
  inconclusive: "text-warning",
};

/**
 * One experiment: what to run, what would count as success, what actually
 * happened, and the review that turns it into a decision.
 *
 * The founder does the work outside Scout. This card exists to make bringing the
 * results back cheap enough that it actually happens.
 */
export function ExperimentCard({
  experiment,
  onMove,
  onRecordObservation,
  onRequestReview,
  busy,
}: {
  experiment: ExperimentRecord;
  onMove: (id: string, status: ExperimentStatus) => void;
  onRecordObservation: (
    id: string,
    observation: {
      kind: ObservationKind;
      text: string;
      numeric_value?: number | null;
      participant_count?: number | null;
    },
  ) => void;
  onRequestReview: (id: string) => void;
  busy?: string;
}) {
  const [kind, setKind] = useState<ObservationKind>("metric");
  const [text, setText] = useState("");
  const [value, setValue] = useState("");
  const [participants, setParticipants] = useState("");

  const moves = EXPERIMENT_TRANSITIONS[experiment.status];
  const savingObservation = busy === `observation:${experiment.id}`;
  const reviewing = busy === `review:${experiment.id}`;
  const moving = busy === `experiment:${experiment.id}`;
  const canRecord = experiment.status === "running" || experiment.status === "planned";

  function submitObservation() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const numeric = value.trim() === "" ? null : Number(value);
    const count = participants.trim() === "" ? null : Number(participants);
    onRecordObservation(experiment.id, {
      kind,
      text: trimmed,
      numeric_value: Number.isFinite(numeric as number) ? numeric : null,
      participant_count: Number.isInteger(count as number) ? count : null,
    });
    setText("");
    setValue("");
    setParticipants("");
  }

  return (
    <li className="panel p-4">
      <Collapsible className="group" defaultOpen={experiment.status === "running"}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] leading-snug font-medium [overflow-wrap:anywhere]">
              {experiment.name}
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {experiment.status}
              {experiment.estimated_time && <> · {experiment.estimated_time}</>}
              {experiment.estimated_cost && <> · {experiment.estimated_cost}</>}
              {experiment.observations.length > 0 && (
                <> · {experiment.observations.length} observation
                  {experiment.observations.length === 1 ? "" : "s"}</>
              )}
              {experiment.result && (
                <>
                  {" · "}
                  <span className={cn("font-medium", RESULT_TONE[experiment.result])}>
                    {experiment.result}
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {moves.map((status) => (
              <Button
                key={status}
                type="button"
                size="sm"
                variant={status === "running" ? "default" : "outline"}
                className="h-7"
                disabled={moving}
                onClick={() => onMove(experiment.id, status)}
              >
                {EXPERIMENT_ACTION_LABEL[status]}
              </Button>
            ))}
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Show details for ${experiment.name}`}
              >
                <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent className="overflow-hidden">
          <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-[13px] sm:grid-cols-2">
            {experiment.goal && (
              <Detail label="Goal" value={experiment.goal} />
            )}
            {experiment.method && (
              <Detail label="Method" value={experiment.method} />
            )}
            {experiment.channel && (
              <Detail label="Channel" value={experiment.channel} />
            )}
            {experiment.target_participant && (
              <Detail label="Who to talk to" value={experiment.target_participant} />
            )}
            {experiment.success_threshold && (
              <Detail label="Success threshold" value={experiment.success_threshold} />
            )}
            {experiment.failure_threshold && (
              <Detail label="Failure threshold" value={experiment.failure_threshold} />
            )}
            {experiment.script && (
              <div className="sm:col-span-2">
                <dt className="label pb-1">Script</dt>
                <dd className="rounded-md border border-border bg-muted/40 p-3 text-[12.5px] leading-relaxed whitespace-pre-wrap">
                  {experiment.script}
                </dd>
              </div>
            )}
            {experiment.assumptions.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="label pb-1">Assumptions under test</dt>
                <dd className="leading-relaxed text-muted-foreground">
                  {experiment.assumptions
                    .map((assumption) => assumption.statement)
                    .join(" · ")}
                </dd>
              </div>
            )}
            {experiment.result_summary && (
              <div className="sm:col-span-2">
                <dt className="label pb-1">Review</dt>
                <dd className="leading-relaxed text-muted-foreground">
                  {experiment.result_summary}
                </dd>
              </div>
            )}
          </dl>

          {experiment.observations.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="label pb-2">What happened</p>
              <ul className="space-y-1.5 text-[13px]">
                {experiment.observations.map((observation) => (
                  <li key={observation.id} className="flex flex-wrap gap-x-2">
                    <span className="text-muted-foreground">{observation.kind}</span>
                    <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                      {observation.text}
                    </span>
                    {observation.participant_count !== null && (
                      <span className="tabular-nums text-subtle-foreground">
                        n={observation.participant_count}
                      </span>
                    )}
                    <LocalTime
                      value={observation.created_at}
                      className="text-[12px] text-subtle-foreground"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canRecord && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="label pb-2">Record what you observed</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <label className="sr-only" htmlFor={`kind-${experiment.id}`}>
                  Observation type
                </label>
                <select
                  id={`kind-${experiment.id}`}
                  value={kind}
                  onChange={(event) => setKind(event.target.value as ObservationKind)}
                  className="h-9 rounded-md border border-border bg-card px-2 text-[12.5px] focus:border-border-strong focus:outline-none"
                >
                  {OBSERVATION_KINDS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="2 of 20 firms accepted the price"
                  aria-label="Observation"
                  className="h-9 min-w-0 flex-1 rounded-md border border-border bg-card px-2.5 text-[13px] placeholder:text-subtle-foreground focus:border-border-strong focus:outline-none"
                />
                <input
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="Value"
                  inputMode="decimal"
                  aria-label="Numeric value"
                  className="h-9 w-full rounded-md border border-border bg-card px-2.5 text-[13px] placeholder:text-subtle-foreground focus:border-border-strong focus:outline-none sm:w-20"
                />
                <input
                  value={participants}
                  onChange={(event) => setParticipants(event.target.value)}
                  placeholder="n"
                  inputMode="numeric"
                  aria-label="Participants"
                  className="h-9 w-full rounded-md border border-border bg-card px-2.5 text-[13px] placeholder:text-subtle-foreground focus:border-border-strong focus:outline-none sm:w-16"
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-9"
                  disabled={!text.trim() || savingObservation}
                  onClick={submitObservation}
                >
                  {savingObservation ? (
                    <Loader2 className="size-3.5 spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
              </div>

              {experiment.observations.length > 0 && !experiment.result && (
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 gap-1.5"
                  disabled={reviewing}
                  onClick={() => onRequestReview(experiment.id)}
                >
                  {reviewing ? (
                    <>
                      <Loader2 className="size-3.5 spin" /> Reviewing
                    </>
                  ) : (
                    "Review results"
                  )}
                </Button>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label pb-1">{label}</dt>
      <dd className="leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}
