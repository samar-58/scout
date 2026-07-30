"use client";

import { CircleHelp, MinusCircle, PlusCircle, Scale } from "lucide-react";
import type { ReactNode } from "react";
import { CanvasSection } from "@/components/canvas/canvas-section";
import type { CanvasEvidence, EvidenceItem } from "@/lib/report-canvas";
import { cn } from "@/lib/utils";

/**
 * Three columns rather than one narrative: a founder should see at a glance
 * whether the research leaned for or against the idea, and what it could not
 * answer at all. The unknown column gets equal weight on purpose.
 */
export function EvidenceBoard({
  evidence,
  index,
}: {
  evidence: CanvasEvidence;
  index: number;
}) {
  const total =
    evidence.supporting.length +
    evidence.contradicting.length +
    evidence.unknown.length;
  if (total === 0) return null;

  return (
    <CanvasSection
      id="evidence"
      index={index}
      icon={Scale}
      eyebrow="Evidence board"
      title="What the research actually found"
      description="Sorted by which way it cuts. Unknowns are the honest gaps Scout could not close from public sources."
      action={
        <span className="rounded-full border border-border px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
          {total} findings
        </span>
      }
    >
      <div className="grid gap-3 lg:grid-cols-3">
        <EvidenceColumn
          title="Supports the idea"
          tone="success"
          icon={<PlusCircle size={13} />}
          items={evidence.supporting}
        />
        <EvidenceColumn
          title="Cuts against it"
          tone="destructive"
          icon={<MinusCircle size={13} />}
          items={evidence.contradicting}
        />
        <EvidenceColumn
          title="Still unknown"
          tone="warning"
          icon={<CircleHelp size={13} />}
          items={evidence.unknown}
        />
      </div>
    </CanvasSection>
  );
}

const TONES = {
  success: {
    head: "text-success",
    wash: "bg-success-muted/30",
    rule: "bg-success/50",
    dot: "bg-success",
  },
  destructive: {
    head: "text-destructive",
    wash: "bg-destructive-muted/30",
    rule: "bg-destructive/50",
    dot: "bg-destructive",
  },
  warning: {
    head: "text-warning",
    wash: "bg-warning-muted/30",
    rule: "bg-warning/50",
    dot: "bg-warning",
  },
} as const;

function EvidenceColumn({
  title,
  tone,
  icon,
  items,
}: {
  title: string;
  tone: keyof typeof TONES;
  icon: ReactNode;
  items: EvidenceItem[];
}) {
  const styles = TONES[tone];

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-background">
      <div className={cn("flex items-center gap-1.5 px-4 py-3", styles.wash)}>
        <span className={styles.head}>{icon}</span>
        <h4
          className={cn(
            "text-[10px] font-semibold tracking-[0.14em] uppercase",
            styles.head,
          )}
        >
          {title}
        </h4>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          {items.length}
        </span>
      </div>
      <span aria-hidden="true" className={cn("h-px w-full", styles.rule)} />

      {items.length === 0 ? (
        <p className="px-4 py-4 text-[12.5px] text-muted-foreground/70">
          Nothing recorded here.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item, position) => (
            <li key={`${item.origin}-${position}`} className="min-w-0 px-4 py-3">
              <p className="flex gap-2.5 text-[12.5px] leading-relaxed text-foreground/85 [overflow-wrap:anywhere]">
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full",
                    styles.dot,
                  )}
                />
                {item.text}
              </p>
              <span className="mt-1.5 ml-4 block font-mono text-[10px] text-muted-foreground">
                {item.origin}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
