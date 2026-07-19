"use client";

import { AgentTimeline } from "@/components/agent-timeline";
import { LivePulse } from "@/components/live-pulse";
import { SearchActivityPanel } from "@/components/search-activity-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { AgentEvent, SearchEvent } from "@/lib/types";

function ProgressMeter({
  label,
  done,
  total,
}: {
  label: string;
  done: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex flex-1 items-center gap-2 sm:flex-initial">
      <span className="w-12 font-mono text-[10px] text-muted-foreground sm:w-auto">
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted sm:w-24 sm:flex-initial">
        <div
          className="h-full rounded-full bg-brand transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right font-mono text-[10px] font-bold text-foreground">
        {done}/{total}
      </span>
    </div>
  );
}

export function LiveResearch({
  agents,
  searches,
  isRunning,
}: {
  agents: AgentEvent[];
  searches: SearchEvent[];
  isRunning: boolean;
}) {
  const agentsDone = agents.filter((a) => a.status === "completed").length;
  const searchesDone = searches.filter((s) => s.status === "completed").length;
  const searchTotal = searches.length || 8;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] duration-500 animate-in fade-in sm:px-6 sm:py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card">
            {isRunning ? (
              <LivePulse size={12} />
            ) : (
              <span className="h-2.5 w-2.5 rounded-full bg-success" />
            )}
          </span>
          <div className="min-w-0">
            <h1 className="font-serif text-lg font-semibold tracking-tight sm:text-xl">
              {isRunning ? "Researching your idea" : "Research complete"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Seven specialists run live web research in parallel.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 sm:gap-5">
          <ProgressMeter label="agents" done={agentsDone} total={7} />
          <ProgressMeter label="search" done={searchesDone} total={searchTotal} />
        </div>
      </div>

      {/* Desktop: side-by-side panels */}
      <div className="mt-6 hidden gap-5 lg:grid lg:grid-cols-2">
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
                {agentsDone}/7
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
            className="scroll-touch max-h-[calc(100dvh-15rem)] overflow-auto rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <AgentTimeline agents={agents} bare />
          </TabsContent>
          <TabsContent
            value="search"
            className="scroll-touch max-h-[calc(100dvh-15rem)] overflow-auto rounded-xl border border-border bg-card p-4 shadow-sm"
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
    <section
      className={cn(
        "flex max-h-[calc(100dvh-13.75rem)] min-h-[340px] flex-col rounded-xl border border-border bg-card shadow-sm",
      )}
    >
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
