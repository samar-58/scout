import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RunOutcome } from "@/hooks/use-startup-stream";

const STATUS_STYLES: Record<string, string> = {
  streaming: "border-primary/30 bg-accent text-accent-foreground",
  submitted: "border-primary/30 bg-accent text-accent-foreground",
  done: "border-success/30 bg-success/10 text-success",
  cancelled: "border-warning/30 bg-warning/10 text-warning",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  idle: "border-border bg-card text-muted-foreground",
  ready: "border-border bg-card text-muted-foreground",
};

export function StatusBar({
  displayStatus,
  isRunning,
}: {
  displayStatus: RunOutcome | string;
  isRunning: boolean;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-[78px] items-center justify-between border-b border-border bg-background/92 px-7 backdrop-blur-md">
      <div>
        <span className="text-[10px] font-extrabold tracking-[0.14em] text-primary">
          MULTI-AGENT RESEARCH
        </span>
        <h1 className="mt-0.5 font-serif text-[22px] font-bold leading-none">
          Startup Stress Test
        </h1>
      </div>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em]",
          STATUS_STYLES[displayStatus] ?? STATUS_STYLES.idle,
        )}
      >
        {isRunning && <LoaderCircle className="spin" size={14} />}
        {displayStatus}
      </span>
    </header>
  );
}
