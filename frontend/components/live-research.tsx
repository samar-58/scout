"use client";

import { PenLine, RotateCcw } from "lucide-react";
import { AgentTimeline } from "@/components/agent-timeline";
import { RunHeader, type RunOutcomeState } from "@/components/run-header";
import { SearchActivityPanel } from "@/components/search-activity-panel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deriveRunPhase } from "@/lib/run-phase";
import type { AgentEvent, SearchEvent } from "@/lib/types";

/**
 * The waiting room. It has to do three jobs: say where the pipeline is, prove
 * work is happening, and — when a run stops or fails — say so and offer a way
 * out. Previously a failed run left the user here with no message at all.
 */
export function LiveResearch({
  agents,
  searches,
  isRunning,
  outcome,
  elapsedMs,
  error,
  onRetry,
  onEditIdea,
}: {
  agents: AgentEvent[];
  searches: SearchEvent[];
  isRunning: boolean;
  outcome: RunOutcomeState;
  elapsedMs: number;
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
  const phase = deriveRunPhase({
    agents,
    searches,
    isRunning,
    hasReport: false,
  });
  const isStalled = outcome === "cancelled" || outcome === "error";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] duration-500 animate-in fade-in sm:px-6 sm:py-6">
      <RunHeader
        phase={phase}
        outcome={outcome}
        elapsedMs={elapsedMs}
        agentsDone={agentsDone}
        agentTotal={agents.length || 7}
        searchesDone={searchesDone}
        searchTotal={searchTotal}
      />

      {isStalled && (
        <div
          role="alert"
          className={
            outcome === "error"
              ? "mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:p-5"
              : "mt-4 rounded-xl border border-warning/30 bg-warning/5 p-4 sm:p-5"
          }
        >
          <h2 className="font-serif text-[15px] font-semibold">
            {outcome === "error"
              ? "Something broke mid-run"
              : "This run was stopped"}
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/75">
            {outcome === "error"
              ? error ||
                "The research stream ended unexpectedly. Retrying usually works — the provider occasionally rate-limits a specialist."
              : "Your inputs are still here. Start the same run again, or change the idea first."}
          </p>
          {outcome === "error" && error && (
            <p className="mt-2.5 rounded-md border border-border bg-card px-3 py-2 font-mono text-[11px] leading-relaxed break-words text-muted-foreground">
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={onRetry} className="gap-2">
              <RotateCcw size={14} />
              Run it again
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onEditIdea}
              className="gap-2"
            >
              <PenLine size={14} />
              Edit the idea
            </Button>
          </div>
          {agentsDone > 0 && (
            <p className="mt-3 text-[11.5px] text-muted-foreground">
              {agentsDone} of {agents.length || 7} specialists had already
              reported. Their findings are below, but no report was produced.
            </p>
          )}
        </div>
      )}

      {/* Desktop: side-by-side panels */}
      <div className="mt-5 hidden gap-5 lg:grid lg:grid-cols-2">
        <Panel eyebrow="Specialists" title="Agent activity">
          <AgentTimeline agents={agents} bare />
        </Panel>
        <Panel eyebrow="Evidence" title="Web research">
          <SearchActivityPanel searches={searches} bare />
        </Panel>
      </div>

      {/* Mobile / tablet: segmented tabs for a single-scroll native feel */}
      <div className="mt-4 lg:hidden">
        <Tabs defaultValue="agents" className="gap-3">
          <TabsList className="h-11 w-full">
            <TabsTrigger value="agents" className="flex-1 text-sm">
              Agents
              <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                {agentsDone}/{agents.length || 7}
              </span>
            </TabsTrigger>
            <TabsTrigger value="search" className="flex-1 text-sm">
              Search
              <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                {searchesDone}/{searchTotal}
              </span>
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="agents"
            className="scroll-touch max-h-[calc(100dvh-19rem)] overflow-auto rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <AgentTimeline agents={agents} bare />
          </TabsContent>
          <TabsContent
            value="search"
            className="scroll-touch max-h-[calc(100dvh-19rem)] overflow-auto rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <SearchActivityPanel searches={searches} bare />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex max-h-[calc(100dvh-17rem)] min-h-[340px] flex-col rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-baseline gap-2.5 border-b border-border px-4 py-3">
        <span className="text-[10px] font-semibold tracking-[0.16em] text-brand uppercase">
          {eyebrow}
        </span>
        <h2 className="font-serif text-sm font-semibold">{title}</h2>
      </div>
      <div className="scroll-touch min-h-0 flex-1 overflow-auto p-4">
        {children}
      </div>
    </section>
  );
}
