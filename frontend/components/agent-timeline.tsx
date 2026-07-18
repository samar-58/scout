"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { agentMeta } from "@/lib/agent-meta";
import type { AgentEvent } from "@/lib/types";

const CONNECTOR_STYLES: Record<AgentEvent["status"], string> = {
  queued: "bg-border",
  running: "bg-brand/40",
  completed: "bg-success/40",
  failed: "bg-destructive/40",
};

function StatusDot({ status }: { status: AgentEvent["status"] }) {
  const base =
    "absolute -right-0.5 -bottom-0.5 grid h-3.5 w-3.5 place-items-center rounded-full border-2 border-card";
  if (status === "running")
    return <span className={cn(base, "animate-pulse bg-brand")} />;
  if (status === "completed")
    return (
      <span className={cn(base, "bg-success text-white")}>
        <Check size={8} strokeWidth={3} />
      </span>
    );
  if (status === "failed")
    return (
      <span className={cn(base, "bg-destructive text-white")}>
        <X size={8} strokeWidth={3} />
      </span>
    );
  return <span className={cn(base, "bg-muted-foreground/40")} />;
}

function AgentStep({ agent, isLast }: { agent: AgentEvent; isLast: boolean }) {
  const meta = agentMeta(agent.agent);
  const Icon = meta.icon;
  const findings = (agent.findings ?? []).slice(0, 3);
  const isQueued = agent.status === "queued";

  return (
    <li className="relative flex gap-3 pb-5 duration-300 animate-in fade-in slide-in-from-left-2 last:pb-0">
      {!isLast && (
        <span
          className={cn(
            "absolute top-9 left-[15px] h-[calc(100%-24px)] w-px",
            CONNECTOR_STYLES[agent.status],
          )}
        />
      )}
      <span className="relative z-10 shrink-0">
        <span
          className={cn(
            "grid h-8 w-8 place-items-center rounded-full",
            meta.chip,
            isQueued && "opacity-45",
            agent.status === "running" && "ring-2 ring-brand/30",
          )}
        >
          <Icon size={15} strokeWidth={1.75} />
        </span>
        <StatusDot status={agent.status} />
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-start justify-between gap-2">
          <strong className="text-[13px] font-semibold">{agent.display_name}</strong>
          {agent.elapsed_ms !== undefined && (
            <time className="shrink-0 pt-0.5 font-mono text-[9px] text-muted-foreground">
              {(agent.elapsed_ms / 1000).toFixed(1)}s
            </time>
          )}
        </div>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          {agent.message}
        </p>
        {findings.length > 0 && (
          <ul className="mt-2 space-y-1">
            {findings.map((finding, index) => (
              <li
                key={index}
                className="flex gap-1.5 text-[11px] leading-snug text-muted-foreground"
              >
                <span
                  className={cn("mt-1.5 h-1 w-1 shrink-0 rounded-full", meta.fill)}
                />
                <span className="min-w-0">{finding}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export function AgentTimeline({
  agents,
  bare = false,
}: {
  agents: AgentEvent[];
  bare?: boolean;
}) {
  const body =
    agents.length === 0 ? (
      <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
        Specialist activity will appear here.
      </p>
    ) : (
      <ol className={cn("list-none", !bare && "mt-3 flex-1 overflow-auto pr-1")}>
        {agents.map((agent, index) => (
          <AgentStep
            key={agent.agent}
            agent={agent}
            isLast={index === agents.length - 1}
          />
        ))}
      </ol>
    );

  if (bare) return body;

  return (
    <section className="flex h-full min-h-[420px] flex-col rounded-lg border border-border bg-card p-4.5 shadow-sm">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[10px] font-semibold tracking-[0.16em] text-brand uppercase">
            Specialists
          </span>
          <h2 className="font-serif text-lg font-semibold">Agent timeline</h2>
        </div>
        <span className="font-mono text-[11px] font-semibold text-muted-foreground">
          {agents.length}/7
        </span>
      </div>
      {body}
    </section>
  );
}
