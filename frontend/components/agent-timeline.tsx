import { Check, Circle, LoaderCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentEvent } from "@/lib/types";

function StatusIcon({ status }: { status: AgentEvent["status"] }) {
  if (status === "running") return <LoaderCircle className="spin" size={15} />;
  if (status === "completed") return <Check size={15} />;
  if (status === "failed") return <X size={15} />;
  return <Circle size={12} />;
}

const ICON_STYLES: Record<AgentEvent["status"], string> = {
  queued: "bg-muted text-muted-foreground",
  running: "bg-accent text-primary",
  completed: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
};

export function AgentTimeline({ agents }: { agents: AgentEvent[] }) {
  return (
    <section className="min-h-[290px] max-h-[390px] overflow-auto rounded-lg border border-border bg-card p-4.5 shadow-sm">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[10px] font-extrabold tracking-[0.14em] text-primary">02</span>
          <h2 className="font-serif text-lg font-bold">Agent timeline</h2>
        </div>
        <span className="font-mono text-[11px] font-bold text-muted-foreground">
          {agents.length}/8
        </span>
      </div>
      {agents.length === 0 ? (
        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
          Specialist activity will appear here.
        </p>
      ) : (
        <ol className="mt-2 list-none">
          {agents.map((agent) => (
            <li
              key={agent.agent}
              className="grid grid-cols-[24px_1fr_auto] items-start gap-2 border-b border-border/60 py-2.5 last:border-b-0"
            >
              <span
                className={cn(
                  "grid h-5 w-5 place-items-center rounded-full",
                  ICON_STYLES[agent.status],
                )}
              >
                <StatusIcon status={agent.status} />
              </span>
              <div>
                <strong className="block text-[11px] font-bold">
                  {agent.display_name}
                </strong>
                <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                  {agent.message}
                </p>
              </div>
              {agent.elapsed_ms !== undefined && (
                <time className="font-mono text-[9px] text-muted-foreground">
                  {(agent.elapsed_ms / 1000).toFixed(1)}s
                </time>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
