"use client";

import { RotateCcw } from "lucide-react";
import { LocalTime } from "@/components/local-time";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";
import {
  phaseIndex,
  RUN_PHASES,
  stageLabel,
  statusMeta,
  TONE_DOT,
} from "@/lib/status-meta";
import type { ResearchRunRecord } from "@/lib/scout-api";
import { cn } from "@/lib/utils";

function canResume(run: ResearchRunRecord) {
  return (
    (run.status === "failed" || run.status === "cancelled") &&
    Boolean(run.checkpoint_stage)
  );
}

/**
 * Run history as rows on a rule.
 *
 * Each run states when it ran, how far it got, and what stopped it. Progress is
 * three ticks rather than three tinted bars: what matters is the boundary
 * between what a resume can skip and what it must redo.
 */
export function RunTimeline({
  runs,
  onResume,
  resumingRunId,
}: {
  runs: ResearchRunRecord[];
  onResume: (runId: string) => void;
  resumingRunId?: string;
}) {
  if (runs.length === 0) {
    return (
      <p className="border-y border-border py-8 text-center text-[13px] text-muted-foreground">
        No research runs have been created for this project yet.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-border border-y border-border">
      {runs.map((run) => {
        const meta = statusMeta(run.status);
        const reached = phaseIndex(run.checkpoint_stage);
        const busy = resumingRunId === run.id;

        return (
          <li key={run.id} className="py-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span
                aria-hidden
                className={cn(
                  "size-1.5 shrink-0 translate-y-[-2px] rounded-full",
                  TONE_DOT[meta.tone],
                )}
              />
              <h3 className="text-[13.5px] font-medium">
                <LocalTime mode="relative" value={run.created_at} />
              </h3>
              <span className="text-[12.5px] text-muted-foreground">
                {meta.label}
                {run.completed_at && (
                  <>
                    {" · "}
                    {formatDuration(run.started_at ?? run.created_at, run.completed_at)}
                  </>
                )}
                {run.resume_count > 0 && ` · resumed ${run.resume_count}×`}
              </span>

              <span className="ml-auto flex items-center gap-3">
                <span className="text-[12px] text-subtle-foreground">
                  <LocalTime value={run.created_at} />
                </span>
                {canResume(run) && (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => onResume(run.id)}
                    disabled={busy}
                    className="gap-1.5"
                  >
                    <RotateCcw className={cn("size-3", busy && "spin")} />
                    {busy ? "Resuming" : "Resume"}
                  </Button>
                )}
              </span>
            </div>

            {/* Phase ticks: filled for completed phases, hollow for the rest. */}
            <ul className="mt-2.5 flex items-center gap-4 pl-4">
              {RUN_PHASES.map((phase, order) => {
                const done = order <= reached;
                return (
                  <li
                    key={phase.key}
                    className="flex items-center gap-1.5"
                    title={phase.detail}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "h-px w-6",
                        done ? "bg-foreground" : "bg-border-strong",
                      )}
                    />
                    <span
                      className={cn(
                        "text-[11.5px]",
                        done ? "text-foreground" : "text-subtle-foreground",
                      )}
                    >
                      {phase.label}
                    </span>
                  </li>
                );
              })}
            </ul>

            {run.error_message ? (
              <p className="mt-2 pl-4 font-mono text-[11.5px] leading-relaxed break-words text-destructive">
                {run.error_message}
              </p>
            ) : run.checkpoint_stage && run.status !== "completed" ? (
              <p className="mt-2 pl-4 text-[12.5px] text-muted-foreground">
                Last checkpoint: {stageLabel(run.checkpoint_stage)}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
