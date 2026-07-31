"use client";

import { Check, X } from "lucide-react";
import { LivePulse } from "@/components/live-pulse";
import { secondsSince } from "@/hooks/use-tick";
import { agentMeta } from "@/lib/agent-meta";
import type { AgentActivity } from "@/lib/run-events";
import { cn } from "@/lib/utils";

/**
 * Specialists as a list.
 *
 * A running specialist shows a live counter and a breathing row, so the view
 * moves even between event batches; a finished one shows its final duration and
 * findings. Colour is limited to the state marker.
 */
export function AgentList({ agents }: { agents: AgentActivity[] }) {
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
        const running = agent.status === "running";
        const live = running ? secondsSince(agent.since) : undefined;

        return (
          <li
            key={agent.agent}
            className={cn(
              "-mx-2 px-2 py-3",
              running && "row-working rounded-md",
              !queued && "row-enter",
            )}
          >
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
              {agent.elapsed_ms !== undefined ? (
                <time className="shrink-0 text-[11px] tabular-nums text-subtle-foreground">
                  {(agent.elapsed_ms / 1000).toFixed(1)}s
                </time>
              ) : live !== undefined ? (
                <time className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {live.toFixed(1)}s
                </time>
              ) : null}
            </div>

            {!queued && agent.message && (
              <p
                className={cn(
                  "mt-1 pl-5 text-[12.5px] leading-snug text-muted-foreground",
                  running && "dots",
                )}
              >
                {agent.message}
              </p>
            )}

            {findings.length > 0 && (
              <ul className="mt-2 space-y-1.5 pl-5">
                {findings.map((finding, index) => (
                  <li
                    key={index}
                    className="row-enter text-[12.5px] leading-relaxed text-foreground/75"
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

function State({ status }: { status: AgentActivity["status"] }) {
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
    <span className="grid w-3.5 shrink-0 place-items-center" aria-label="queued">
      <span className="size-1.5 rounded-full bg-border-strong" />
    </span>
  );
}
