"use client";

import { ChevronDown, Radar } from "lucide-react";
import { useState } from "react";
import { AgentTimeline } from "@/components/agent-timeline";
import { SearchActivityPanel } from "@/components/search-activity-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { AgentEvent, SearchEvent } from "@/lib/types";

/**
 * Provenance drawer for a finished run.
 *
 * While a run is live this content is the main event (see `LiveResearch`).
 * Afterwards it becomes an audit trail — worth keeping, not worth a permanent
 * sidebar next to the canvas — so it collapses at every breakpoint and sits
 * below the workspace.
 */
export function ResearchActivity({
  agents,
  searches,
}: {
  agents: AgentEvent[];
  searches: SearchEvent[];
}) {
  const [open, setOpen] = useState(false);

  const agentsDone = agents.filter(
    (agent) => agent.status === "completed" || agent.status === "failed",
  ).length;
  const searchesDone = searches.filter(
    (search) => search.status === "completed",
  ).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-surface-sunken text-muted-foreground">
            <Radar size={15} strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[13.5px] font-semibold">How this was researched</h2>
            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
              {searchesDone} searches · {agentsDone} specialist reports · every
              query and source
            </p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="border-t border-border">
          <Tabs defaultValue="agents" className="gap-0">
            <div className="px-3 pt-3">
              <TabsList className="h-10 w-full">
                <TabsTrigger value="agents" className="flex-1 text-[13px]">
                  Specialists
                  <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                    {agentsDone}/{agents.length || 7}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="search" className="flex-1 text-[13px]">
                  Searches
                  <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                    {searchesDone}/{searches.length || 8}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent
              value="agents"
              className="scroll-touch max-h-[60dvh] overflow-auto p-4"
            >
              <AgentTimeline agents={agents} bare />
            </TabsContent>
            <TabsContent
              value="search"
              className="scroll-touch max-h-[60dvh] overflow-auto p-4"
            >
              <SearchActivityPanel searches={searches} bare />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </section>
  );
}
