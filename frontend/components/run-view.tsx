"use client";

import { PenLine, RotateCcw } from "lucide-react";
import { AgentList } from "@/components/run/agent-list";
import { SearchLog } from "@/components/run/search-log";
import { Button } from "@/components/ui/button";
import { deriveRunPhase } from "@/lib/run-phase";
import type { AgentEvent, SearchEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

export type RunOutcomeState = "running" | "done" | "cancelled" | "error";

/**
 * The waiting room.
 *
 * It answers three questions and nothing else: where is the pipeline, what has
 * it found, and — if it stopped — what now. The previous version answered them
 * with a status orb, a four-segment stepper, two percentage meters, a tinted
 * alert panel and two tabbed card stacks. This keeps one progress line, two
 * plain columns, and the stop/failure message as text.
 */
export function RunView({
  agents,
  searches,
  isRunning,
  outcome,
  error,
  onRetry,
  onEditIdea,
}: {
  agents: AgentEvent[];
  searches: SearchEvent[];
  isRunning: boolean;
  outcome: RunOutcomeState;
  error?: string;
  onRetry: () => void;
  onEditIdea: () => void;
}) {
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

  // Three phases, weighted the way the run actually spends its time.
  const progress = stalled
    ? 0
    : Math.min(
        100,
        Math.round(
          (searchesDone / searchTotal) * 40 + (agentsDone / agentTotal) * 55,
        ),
      );

  return (
    <div className="view-enter mx-auto w-full max-w-[76rem] px-4 py-6 pb-safe sm:px-6">
      {/* Progress: one line, one number. */}
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[15px] font-medium" aria-live="polite">
          {stalled
            ? outcome === "error"
              ? "Research failed"
              : "Research stopped"
            : phase.label}
        </h2>
        <p className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
          {searchesDone}/{searchTotal} searches · {agentsDone}/{agentTotal}{" "}
          specialists
        </p>
      </div>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {stalled
          ? outcome === "error"
            ? "The run ended before a report could be produced."
            : "You stopped this run. Evidence collected so far stays in the project history."
          : phase.detail}
      </p>
      <div className="mt-3 h-px w-full bg-border">
        <div
          className={cn(
            "h-px transition-[width] duration-700 ease-out",
            stalled ? "bg-border-strong" : "bg-foreground",
          )}
          style={{ width: `${stalled ? 100 : progress}%` }}
        />
      </div>

      {stalled && (
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
            <Button type="button" size="sm" onClick={onRetry} className="gap-1.5">
              <RotateCcw size={13} /> Run it again
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onEditIdea}
              className="gap-1.5"
            >
              <PenLine size={13} /> Edit the idea
            </Button>
          </div>
        </div>
      )}

      {/* Two columns on desktop, one continuous scroll on mobile. */}
      <div className="mt-7 grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <section>
          <h3 className="label pb-3">Specialists</h3>
          <AgentList agents={agents} />
        </section>
        <section>
          <h3 className="label pb-3">Web research</h3>
          <SearchLog searches={searches} />
        </section>
      </div>
    </div>
  );
}
