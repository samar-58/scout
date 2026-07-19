"use client";

import { AgentTimeline } from "@/components/agent-timeline";
import { LivePulse } from "@/components/live-pulse";
import { SearchActivityPanel } from "@/components/search-activity-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AgentEvent, SearchEvent } from "@/lib/types";

export function ResearchActivity({
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
    <section className="flex flex-col rounded-xl border border-border bg-card shadow-sm lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-92px)]">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          {isRunning ? (
            <LivePulse size={10} />
          ) : (
            <span className="h-2 w-2 rounded-full bg-success" />
          )}
          <h2 className="font-serif text-sm font-semibold">Research activity</h2>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">
          {isRunning ? "live" : "done"}
        </span>
      </div>

      <Tabs defaultValue="agents" className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="px-3 pt-3">
          <TabsList className="w-full">
            <TabsTrigger value="agents" className="flex-1 text-xs">
              Agents
              <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                {agentsDone}/{agents.length || 7}
              </span>
            </TabsTrigger>
            <TabsTrigger value="search" className="flex-1 text-xs">
              Search
              <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                {searchesDone}/{searches.length || 8}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="agents"
          className="min-h-0 flex-1 overflow-auto px-4 pt-4 pb-4"
        >
          <AgentTimeline agents={agents} bare />
        </TabsContent>
        <TabsContent
          value="search"
          className="min-h-0 flex-1 overflow-auto px-4 pt-4 pb-4"
        >
          <SearchActivityPanel searches={searches} bare />
        </TabsContent>
      </Tabs>
    </section>
  );
}
