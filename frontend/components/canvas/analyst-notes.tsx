"use client";

import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CanvasSection } from "@/components/canvas/canvas-section";
import type { AnalystNote } from "@/lib/report-canvas";

/**
 * Each specialist's own summary, in its own words. These were previously only
 * readable inside the Markdown report; with that view removed they live here so
 * the canvas is a strict superset of what the report showed.
 *
 * One row per analyst, disclosed on click. The agent icon tiles are gone: seven
 * bordered glyphs to label seven names the rows already state.
 */
export function AnalystNotes({ notes }: { notes: AnalystNote[] }) {
  if (notes.length === 0) return null;

  return (
    <CanvasSection
      id="notes"
      eyebrow="Analyst notes"
      title="What each specialist concluded"
      description="The raw take from every agent before synthesis reconciled them."
    >
      <ul className="divide-y divide-border border-y border-border">
        {notes.map((note) => (
          <li key={note.agent}>
            <Collapsible className="group">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-baseline gap-3 py-3 text-left"
                >
                  <span className="w-[9.5rem] shrink-0 text-[13px] font-medium">
                    {note.label}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground group-data-[state=open]:opacity-0">
                    {note.note}
                  </span>
                  <ChevronDown
                    size={14}
                    className="shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p className="max-w-3xl pb-4 pl-0 text-[13px] leading-relaxed text-foreground/80 sm:pl-[9.5rem]">
                  {note.note}
                </p>
              </CollapsibleContent>
            </Collapsible>
          </li>
        ))}
      </ul>
    </CanvasSection>
  );
}
