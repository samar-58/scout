"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AgentTimeline } from "@/components/agent-timeline";
import { LivePulse } from "@/components/live-pulse";
import { SearchActivityPanel } from "@/components/search-activity-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
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
  // Collapsed by default on mobile so the report is front-and-centre; the
  // desktop sidebar (lg+) is always expanded regardless of this state.
  const [open, setOpen] = useState(false);

  const agentsDone = agents.filter((a) => a.status === "completed").length;
  const searchesDone = searches.filter((s) => s.status === "completed").length;

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:sticky lg:top-[76px] lg:max-h-[calc(100dvh-92px)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 text-left transition-colors active:bg-muted lg:pointer-events-none lg:cursor-default"
      >
        <div className="flex min-w-0 items-center gap-2">
          {isRunning ? (
            <LivePulse size={10} />
          ) : (
            <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
          )}
          <h2 className="truncate font-serif text-sm font-semibold">
            Research activity
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="font-mono text-[10px] text-muted-foreground">
            <span className="lg:hidden">
              {agentsDone + searchesDone}/{7 + (searches.length || 8)}
            </span>
            <span className="hidden lg:inline">{isRunning ? "live" : "done"}</span>
          </span>
          <ChevronDown
            size={16}
            className={cn(
              "text-muted-foreground transition-transform lg:hidden",
              open && "rotate-180",
            )}
          />
        </div>
      </button>

      <div
        className={cn(
          "min-h-0 flex-1 flex-col lg:flex",
          open ? "flex" : "hidden",
        )}
      >
        <Tabs defaultValue="agents" className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="px-3 pt-3">
            <TabsList className="h-11 w-full lg:h-9">
              <TabsTrigger value="agents" className="flex-1 text-sm lg:text-xs">
                Agents
                <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                  {agentsDone}/{agents.length || 7}
                </span>
              </TabsTrigger>
              <TabsTrigger value="search" className="flex-1 text-sm lg:text-xs">
                Search
                <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                  {searchesDone}/{searches.length || 8}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="agents"
            className="scroll-touch max-h-[55dvh] min-h-0 flex-1 overflow-auto px-4 pt-4 pb-4 lg:max-h-none"
          >
            <AgentTimeline agents={agents} bare />
          </TabsContent>
          <TabsContent
            value="search"
            className="scroll-touch max-h-[55dvh] min-h-0 flex-1 overflow-auto px-4 pt-4 pb-4 lg:max-h-none"
          >
            <SearchActivityPanel searches={searches} bare />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
