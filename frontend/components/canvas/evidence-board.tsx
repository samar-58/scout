"use client";

import { CanvasSection } from "@/components/canvas/canvas-section";
import type { CanvasEvidence, EvidenceItem } from "@/lib/report-canvas";
import { cn } from "@/lib/utils";

/**
 * Three columns rather than one narrative: a founder should see at a glance
 * whether the research leaned for or against the idea, and what it could not
 * answer at all. The unknown column gets equal weight on purpose.
 *
 * Colour here is one dot per item — the direction of a finding is the only thing
 * worth encoding. The washed headers, tinted rules and icon set this had before
 * repeated that same fact four times per column.
 */
export function EvidenceBoard({ evidence }: { evidence: CanvasEvidence }) {
  const total =
    evidence.supporting.length +
    evidence.contradicting.length +
    evidence.unknown.length;
  if (total === 0) return null;

  return (
    <CanvasSection
      id="evidence"
      eyebrow="Evidence"
      title="What the research actually found"
      description="Sorted by which way it cuts. Unknowns are the honest gaps Scout could not close from public sources."
    >
      <div className="grid gap-x-8 gap-y-7 lg:grid-cols-3">
        <EvidenceColumn
          title="Supports"
          dot="bg-success"
          items={evidence.supporting}
        />
        <EvidenceColumn
          title="Cuts against"
          dot="bg-destructive"
          items={evidence.contradicting}
        />
        <EvidenceColumn
          title="Still unknown"
          dot="bg-warning"
          items={evidence.unknown}
        />
      </div>
    </CanvasSection>
  );
}

function EvidenceColumn({
  title,
  dot,
  items,
}: {
  title: string;
  dot: string;
  items: EvidenceItem[];
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline gap-2 border-b border-border pb-2">
        <span aria-hidden className={cn("size-1.5 rounded-full", dot)} />
        <h4 className="text-[13px] font-medium">{title}</h4>
        <span className="ml-auto text-[11px] tabular-nums text-subtle-foreground">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="pt-3 text-[12.5px] text-subtle-foreground">
          Nothing recorded here.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item, position) => (
            <li key={`${item.origin}-${position}`} className="min-w-0 py-3">
              <p className="text-[13px] leading-relaxed text-foreground/85 [overflow-wrap:anywhere]">
                {item.text}
              </p>
              <span className="mt-1 block text-[11.5px] text-muted-foreground">
                {item.origin}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
