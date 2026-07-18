"use client";

import { Loader2 } from "lucide-react";
import { AgentTimeline } from "@/components/agent-timeline";
import { SearchActivityPanel } from "@/components/search-activity-panel";
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
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-brand transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[10px] font-bold text-foreground">
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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 duration-500 animate-in fade-in sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card">
            {isRunning ? (
              <Loader2 size={18} className="animate-spin text-brand" />
            ) : (
              <span className="h-2.5 w-2.5 rounded-full bg-success" />
            )}
          </span>
          <div>
            <h1 className="font-serif text-xl font-semibold tracking-tight">
              {isRunning ? "Researching your idea" : "Research complete"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Seven specialists are running live web research in parallel.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-5">
          <ProgressMeter label="agents" done={agentsDone} total={7} />
          <ProgressMeter
            label="search"
            done={searchesDone}
            total={searches.length || 8}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Panel eyebrow="Specialists" title="Agent activity">
          <AgentTimeline agents={agents} bare />
        </Panel>
        <Panel eyebrow="Evidence" title="Web research">
          <SearchActivityPanel searches={searches} bare />
        </Panel>
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
        "flex max-h-[calc(100vh-220px)] min-h-[340px] flex-col rounded-xl border border-border bg-card shadow-sm",
      )}
    >
      <div className="flex items-baseline gap-2.5 border-b border-border px-4 py-3">
        <span className="text-[10px] font-semibold tracking-[0.16em] text-brand uppercase">
          {eyebrow}
        </span>
        <h2 className="font-serif text-sm font-semibold">{title}</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
    </section>
  );
}
