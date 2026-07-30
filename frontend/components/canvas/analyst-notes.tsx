"use client";

import { ChevronDown, NotebookPen } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CanvasSection } from "@/components/canvas/canvas-section";
import { agentMeta } from "@/lib/agent-meta";
import type { AnalystNote } from "@/lib/report-canvas";

/**
 * Each specialist's own summary, in its own words. These were previously only
 * readable inside the Markdown report; with that view removed they live here so
 * the canvas is a strict superset of what the report showed.
 */
export function AnalystNotes({
  notes,
  index,
}: {
  notes: AnalystNote[];
  index: number;
}) {
  if (notes.length === 0) return null;

  return (
    <CanvasSection
      id="notes"
      index={index}
      icon={NotebookPen}
      eyebrow="Analyst notes"
      title="What each specialist concluded"
      description="The raw take from every agent before synthesis reconciled them."
      action={
        <span className="rounded-full border border-border px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
          {notes.length} notes
        </span>
      }
    >
      <ul className="grid gap-2.5">
        {notes.map((note) => {
          const meta = agentMeta(note.agent);
          const Icon = meta.icon;
          return (
            <li
              key={note.agent}
              className="overflow-hidden rounded-xl border border-border bg-background"
            >
              <Collapsible className="group">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-surface-sunken text-foreground/80">
                      <Icon size={14} strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-semibold">
                        {note.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                        {note.note}
                      </span>
                    </span>
                    <ChevronDown
                      size={15}
                      className="shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="border-t border-border px-4 py-3.5 text-[13px] leading-relaxed text-foreground/80">
                    {note.note}
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </li>
          );
        })}
      </ul>
    </CanvasSection>
  );
}
