"use client";

import { Check, X } from "lucide-react";
import { LivePulse } from "@/components/live-pulse";
import { agentMeta } from "@/lib/agent-meta";
import type { AgentEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Specialists as a list, not a timeline of avatars.
 *
 * Seven rows, each a name, a state, and its findings once they arrive. The
 * connector line, coloured icon chips and pulsing rings the old timeline used
 * carried no information the state marker didn't already carry.
 */
export function AgentList({ agents }: { agents: AgentEvent[] }) {
  if (agents.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Specialist activity will appear here.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border border-y border-border">
      {agents.map((agent) => {
        const meta = agentMeta(agent.agent);
        const findings = (agent.findings ?? []).slice(0, 3);
        const queued = agent.status === "queued";

        return (
          <li key={agent.agent} className="py-3">
            <div className="flex items-baseline gap-2.5">
              <State status={agent.status} />
              <span
                className={cn(
                  "min-w-0 flex-1 text-[13px] font-medium",
                  queued && "text-muted-foreground",
                )}
              >
                {agent.display_name || meta.label}
              </span>
              {agent.elapsed_ms !== undefined && (
                <time className="shrink-0 text-[11px] tabular-nums text-subtle-foreground">
                  {(agent.elapsed_ms / 1000).toFixed(1)}s
                </time>
              )}
            </div>

            {!queued && agent.message && (
              <p className="mt-1 pl-5 text-[12.5px] leading-snug text-muted-foreground">
                {agent.message}
              </p>
            )}

            {findings.length > 0 && (
              <ul className="mt-2 space-y-1.5 pl-5">
                {findings.map((finding, index) => (
                  <li
                    key={index}
                    className="text-[12.5px] leading-relaxed text-foreground/75"
                  >
                    {finding}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function State({ status }: { status: AgentEvent["status"] }) {
  if (status === "running") {
    return (
      <span className="grid w-3.5 shrink-0 place-items-center">
        <LivePulse size={8} />
      </span>
    );
  }
  if (status === "completed") {
    return (
      <Check
        size={13}
        strokeWidth={2.5}
        className="w-3.5 shrink-0 text-success"
        aria-label="completed"
      />
    );
  }
  if (status === "failed") {
    return (
      <X
        size={13}
        strokeWidth={2.5}
        className="w-3.5 shrink-0 text-destructive"
        aria-label="failed"
      />
    );
  }
  return (
    <span
      className="grid w-3.5 shrink-0 place-items-center"
      aria-label="queued"
    >
      <span className="size-1.5 rounded-full bg-border-strong" />
    </span>
  );
}
