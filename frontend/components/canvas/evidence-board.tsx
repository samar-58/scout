"use client";

import { useState } from "react";
import { CanvasSection } from "@/components/canvas/canvas-section";
import { LocalTime } from "@/components/local-time";
import type { CanvasEvidence, EvidenceItem } from "@/lib/report-canvas";
import { cn } from "@/lib/utils";

/**
 * Three columns rather than one narrative: a founder should see at a glance
 * whether the research leaned for or against the idea, and what it could not
 * answer at all. Persisted claims expand to snippet, source, and workflow.
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
            <EvidenceRow
              key={item.claimId ?? `${item.origin}-${position}`}
              item={item}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function EvidenceRow({ item }: { item: EvidenceItem }) {
  const [open, setOpen] = useState(false);
  const expandable = Boolean(
    item.snippet || item.sourceUrl || item.workflow || item.createdAt,
  );

  return (
    <li className="min-w-0 py-3">
      {expandable ? (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="w-full text-left"
          aria-expanded={open}
        >
          <p className="text-[13px] leading-relaxed text-foreground/85 [overflow-wrap:anywhere]">
            {item.text}
          </p>
          <span className="mt-1 block text-[11.5px] text-muted-foreground">
            {item.origin}
            {open ? " · hide source" : " · show source"}
          </span>
        </button>
      ) : (
        <>
          <p className="text-[13px] leading-relaxed text-foreground/85 [overflow-wrap:anywhere]">
            {item.text}
          </p>
          <span className="mt-1 block text-[11.5px] text-muted-foreground">
            {item.origin}
          </span>
        </>
      )}

      {open && expandable && (
        <div className="mt-2 space-y-1.5 border-l-2 border-border pl-3 text-[12.5px] leading-relaxed text-muted-foreground">
          {item.snippet && (
            <p className="text-foreground/75 [overflow-wrap:anywhere]">
              “{item.snippet}”
            </p>
          )}
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-foreground underline-offset-4 hover:underline [overflow-wrap:anywhere]"
            >
              {item.sourceTitle?.trim() || item.sourceUrl}
            </a>
          )}
          {(item.workflow || item.createdAt) && (
            <p>
              {item.workflow}
              {item.workflow && item.createdAt ? " · " : null}
              {item.createdAt ? (
                <>
                  recorded <LocalTime value={item.createdAt} />
                </>
              ) : null}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
