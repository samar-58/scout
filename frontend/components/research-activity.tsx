"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { RunActivity } from "@/components/projects/run-activity";
import { cn } from "@/lib/utils";

/**
 * Provenance for a finished run, replayed from its persisted events.
 *
 * While a run is live this content is the page (see `RunView`). Afterwards it is
 * an audit trail — worth keeping, not worth competing with the canvas — so it
 * stays collapsed behind one line at the end of the page and only fetches its
 * events when opened.
 */
export function ResearchActivity({ runId }: { runId: string }) {
  const [open, setOpen] = useState(false);

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
          Every specialist report, query, and source behind this version
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "ml-auto shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && <RunActivity runId={runId} />}
    </section>
  );
}
