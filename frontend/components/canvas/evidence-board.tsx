"use client";

import { CircleHelp, MinusCircle, PlusCircle } from "lucide-react";
import type { ReactNode } from "react";
import { CanvasSection } from "@/components/canvas/canvas-section";
import type { CanvasEvidence, EvidenceItem } from "@/lib/report-canvas";

/**
 * Three columns rather than one narrative: a founder should be able to see at a
 * glance whether the research leaned for or against the idea, and what it could
 * not answer at all.
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
      eyebrow="Evidence board"
      title="What the research actually found"
      description="Sorted by which way it cuts. Unknowns are the honest gaps Scout could not close from public sources."
    >
      <div className="grid gap-3 lg:grid-cols-3">
        <EvidenceColumn
          title="Supports the idea"
          tone="text-success"
          icon={<PlusCircle size={13} />}
          items={evidence.supporting}
        />
        <EvidenceColumn
          title="Cuts against it"
          tone="text-destructive"
          icon={<MinusCircle size={13} />}
          items={evidence.contradicting}
        />
        <EvidenceColumn
          title="Still unknown"
          tone="text-warning"
          icon={<CircleHelp size={13} />}
          items={evidence.unknown}
        />
      </div>
    </CanvasSection>
  );
}

function EvidenceColumn({
  title,
  tone,
  icon,
  items,
}: {
  title: string;
  tone: string;
  icon: ReactNode;
  items: EvidenceItem[];
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3.5">
      <h4
        className={`flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] uppercase ${tone}`}
      >
        {icon}
        {title}
        <span className="ml-auto font-mono text-[10px] tracking-normal text-muted-foreground normal-case">
          {items.length}
        </span>
      </h4>
      {items.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-muted-foreground/70">
          Nothing recorded here.
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {items.map((item, index) => (
            <li key={`${item.origin}-${index}`} className="min-w-0">
              <p className="text-[12.5px] leading-relaxed text-foreground/80 [overflow-wrap:anywhere]">
                {item.text}
              </p>
              <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                {item.origin}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
