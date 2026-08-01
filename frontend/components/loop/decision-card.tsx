"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { LocalTime } from "@/components/local-time";
import { Button } from "@/components/ui/button";
import { THESIS_FIELD_LABELS } from "@/lib/loop-meta";
import type { DecisionRecord } from "@/lib/scout-api";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<DecisionRecord["status"], string> = {
  proposed: "text-brand",
  confirmed: "text-success",
  rejected: "text-muted-foreground",
};

/**
 * A proposed decision and its evidence.
 *
 * Scout can propose; only the founder's confirmation writes a new thesis version.
 * The card shows both sides of the evidence and what would reverse the decision,
 * so confirming is a judgement rather than a formality.
 */
export function DecisionCard({
  decision,
  onConfirm,
  onReject,
  busy,
}: {
  decision: DecisionRecord;
  onConfirm: (id: string, note?: string) => void;
  onReject: (id: string, note?: string) => void;
  busy?: string;
}) {
  const [note, setNote] = useState("");
  const isBusy = busy === `decision:${decision.id}`;
  const pending = decision.status === "proposed";
  const changes = Object.entries(decision.thesis_changes);

  return (
    <li className="panel p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="min-w-0 flex-1 text-[13.5px] leading-snug font-medium [overflow-wrap:anywhere]">
          {decision.proposal}
        </p>
        <span className={cn("text-[12px] font-medium", STATUS_TONE[decision.status])}>
          {decision.status}
        </span>
      </div>

      <p className="mt-1 text-[12px] text-muted-foreground">
        <LocalTime value={decision.confirmed_at ?? decision.created_at} />
        {decision.confidence !== null && <> · {decision.confidence}% confidence</>}
        {changes.length === 0 && <> · no thesis change</>}
      </p>

      {decision.rationale && (
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
          {decision.rationale}
        </p>
      )}

      <div className="mt-3 grid gap-3 text-[13px] sm:grid-cols-2">
        {decision.supporting_evidence.length > 0 && (
          <div>
            <p className="label pb-1">Supporting</p>
            <ul className="space-y-1 text-muted-foreground">
              {decision.supporting_evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {decision.contradicting_evidence.length > 0 && (
          <div>
            <p className="label pb-1">Contradicting</p>
            <ul className="space-y-1 text-muted-foreground">
              {decision.contradicting_evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {changes.length > 0 && (
        <dl className="mt-3 divide-y divide-border border-y border-border text-[13px]">
          {changes.map(([field, value]) => (
            <div key={field} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
              <dt className="w-40 shrink-0 text-[12px] text-muted-foreground">
                {THESIS_FIELD_LABELS.find((entry) => entry.key === field)?.label ?? field}
              </dt>
              <dd className="min-w-0 flex-1 [overflow-wrap:anywhere]">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {decision.reversal_conditions && (
        <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Reverses if:</span>{" "}
          {decision.reversal_conditions}
        </p>
      )}

      {pending && (
        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center">
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add a note for the record (optional)"
            aria-label="Decision note"
            className="h-9 min-w-0 flex-1 rounded-md border border-border bg-card px-2.5 text-[13px] placeholder:text-subtle-foreground focus:border-border-strong focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-9 gap-1.5"
              disabled={isBusy}
              onClick={() => onConfirm(decision.id, note.trim() || undefined)}
            >
              {isBusy ? <Loader2 className="size-3.5 spin" /> : null}
              {changes.length > 0 ? "Confirm and update thesis" : "Confirm"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9"
              disabled={isBusy}
              onClick={() => onReject(decision.id, note.trim() || undefined)}
            >
              Reject
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
