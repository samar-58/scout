"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { AgentList } from "@/components/run/agent-list";
import { SearchLog } from "@/components/run/search-log";
import type { AgentEvent, SearchEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Provenance for a finished run.
 *
 * While a run is live this content is the main event (see `RunView`). Afterwards
 * it is an audit trail — worth keeping, not worth competing with the canvas — so
 * it stays collapsed behind one line at the end of the page.
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

  if (agents.length === 0 && searches.length === 0) return null;

  return (
    <section className="border-t border-border pt-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-baseline gap-2 text-left"
      >
        <span className="text-[13px] font-medium">How this was researched</span>
        <span className="text-[12.5px] text-muted-foreground">
          {searchesDone} searches · {agentsDone} specialist reports
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "ml-auto shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="mt-5 grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div>
            <h3 className="label pb-3">Specialists</h3>
            <AgentList agents={agents} />
          </div>
          <div>
            <h3 className="label pb-3">Web research</h3>
            <SearchLog searches={searches} />
          </div>
        </div>
      )}
    </section>
  );
}
