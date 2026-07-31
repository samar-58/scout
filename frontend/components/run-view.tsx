"use client";

import { PenLine, RotateCcw } from "lucide-react";
import { AgentList } from "@/components/run/agent-list";
import { SearchLog } from "@/components/run/search-log";
import { Button } from "@/components/ui/button";
import { useTick } from "@/hooks/use-tick";
import { deriveRunPhase, formatElapsed } from "@/lib/run-phase";
import type { RunActivity } from "@/lib/run-events";
import { cn } from "@/lib/utils";

export type RunOutcomeState = "running" | "done" | "cancelled" | "error";

/**
 * The live run.
 *
 * One component for every place a run is watched — the project it belongs to,
 * and a reload halfway through. Progress is one rule and one count; the sense of
 * motion comes from the rows themselves (live counters, breathing working rows)
 * rather than from spinners bolted onto a static layout.
 */
export function RunView({
  activity,
  isRunning,
  outcome,
  startedAt,
  error,
  warning,
  onRetry,
  onEditIdea,
  retryLabel = "Run it again",
}: {
  activity: RunActivity;
  isRunning: boolean;
  outcome: RunOutcomeState;
  /**
   * When watching began, in epoch ms. Elapsed time is derived here rather than
   * passed in: the local tick re-renders this component only, so a computed prop
   * from the parent would freeze at its first value.
   */
  startedAt?: number;
  error?: string;
  /** Transient connectivity notice; the run itself is still assumed alive. */
  warning?: string;
  onRetry?: () => void;
  onEditIdea?: () => void;
  retryLabel?: string;
}) {
  // Local clock so counters advance between event batches.
  useTick(isRunning);

  const elapsedMs = startedAt ? Date.now() - startedAt : undefined;

  const { agents, searches } = activity;
  const agentsDone = agents.filter(
    (agent) => agent.status === "completed" || agent.status === "failed",
  ).length;
  const searchesDone = searches.filter(
    (search) => search.status === "completed",
  ).length;
  const searchTotal = searches.length || 8;
  const agentTotal = agents.length || 7;
  const phase = deriveRunPhase({ agents, searches, isRunning, hasReport: false });
  const stalled = outcome === "cancelled" || outcome === "error";
  const waiting = isRunning && agents.length === 0 && searches.length === 0;

  // Weighted the way the run actually spends its time.
  const progress = Math.min(
    100,
    Math.round((searchesDone / searchTotal) * 40 + (agentsDone / agentTotal) * 55),
  );

  return (
    <div className="view-enter mx-auto w-full max-w-[76rem] px-4 py-6 pb-safe sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="flex items-baseline gap-2 text-[15px] font-medium" aria-live="polite">
          {stalled
            ? outcome === "error"
              ? "Research failed"
              : "Research stopped"
            : waiting
              ? "Starting the research"
              : phase.label}
          {isRunning && elapsedMs !== undefined && (
            <span className="text-[12px] font-normal tabular-nums text-muted-foreground">
              {formatElapsed(elapsedMs)}
            </span>
          )}
        </h2>
        <p className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
          {searchesDone}/{searchTotal} searches · {agentsDone}/{agentTotal}{" "}
          specialists
        </p>
      </div>

      <p className={cn("mt-1 text-[13px] text-muted-foreground", isRunning && "dots")}>
        {stalled
          ? outcome === "error"
            ? "The run ended before a report could be produced."
            : "You stopped this run. Evidence collected so far stays in the project history."
          : waiting
            ? "The worker has picked up the run and is planning its queries"
            : phase.detail}
      </p>

      {/*
        The rule carries two things at once: how far the run has got, and that it
        is still moving. The completed portion sweeps while the run is live.
      */}
      <div className="mt-3 h-px w-full bg-border">
        <div
          className={cn(
            "h-px transition-[width] duration-700 ease-out",
            stalled ? "bg-border-strong" : isRunning ? "rule-active" : "bg-foreground",
          )}
          style={{ width: `${stalled ? 100 : Math.max(waiting ? 8 : 4, progress)}%` }}
        />
      </div>

      {/*
        A failed poll is not a failed run — the work continues in the durable
        worker — so connectivity trouble is a quiet note, not an error state.
      */}
      {warning && !stalled && (
        <p className="mt-2 text-[12px] text-muted-foreground" role="status">
          {warning}
        </p>
      )}

      {stalled && (onRetry || onEditIdea) && (
        <div role="alert" className="mt-5 border-l-2 border-border-strong pl-4">
          {error && (
            <p className="font-mono text-[12px] leading-relaxed break-words text-destructive">
              {error}
            </p>
          )}
          {agentsDone > 0 && (
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              {agentsDone} of {agentTotal} specialists had already reported. Their
              findings are below, but no report was produced.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {onRetry && (
              <Button type="button" size="sm" onClick={onRetry} className="gap-1.5">
                <RotateCcw size={13} /> {retryLabel}
              </Button>
            )}
            {onEditIdea && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onEditIdea}
                className="gap-1.5"
              >
                <PenLine size={13} /> Edit the idea
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Two columns on desktop, one continuous scroll on mobile. */}
      <div className="mt-7 grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <section>
          <h3 className="label pb-3">Specialists</h3>
          {waiting ? <WaitingRows rows={7} /> : <AgentList agents={agents} />}
        </section>
        <section>
          <h3 className="label pb-3">Web research</h3>
          {waiting ? <WaitingRows rows={8} /> : <SearchLog searches={searches} />}
        </section>
      </div>
    </div>
  );
}

/**
 * Placeholder rows for the gap between dispatch and the first event. Without
 * them the run opened as an empty page for a few seconds, which read as broken
 * rather than as queued.
 */
function WaitingRows({ rows }: { rows: number }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex items-center gap-2.5 py-3">
          <span className="size-1.5 shrink-0 rounded-full bg-border-strong" />
          <span
            className="h-2.5 animate-pulse rounded bg-muted"
            style={{ width: `${52 + ((index * 13) % 34)}%` }}
          />
        </li>
      ))}
    </ul>
  );
}
