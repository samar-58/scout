"use client";

import { LivePulse } from "@/components/live-pulse";
import type { ResearchRunStatus } from "@/lib/scout-api";
import { statusMeta, TONE_DOT, type StatusTone } from "@/lib/status-meta";
import { cn } from "@/lib/utils";

/**
 * Status as a dot and a word.
 *
 * It used to be a tinted, bordered, uppercase pill in one of five colours,
 * which made every list look like a legend. A dot carries the same state at a
 * tenth of the ink, and the word next to it does the rest. The live pulse is
 * the one exception: motion is what distinguishes "still working" from "done".
 */
export function StatusChip({
  status,
  className,
  label,
  tone,
  pulse,
}: {
  status?: ResearchRunStatus | null;
  className?: string;
  /** Overrides the derived label (used for stream-side statuses). */
  label?: string;
  tone?: StatusTone;
  pulse?: boolean;
}) {
  const meta = statusMeta(status);
  const resolvedTone = tone ?? meta.tone;
  const isLive = pulse ?? meta.active;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[12px] whitespace-nowrap text-muted-foreground",
        className,
      )}
      title={meta.description}
    >
      {isLive ? (
        <LivePulse size={8} />
      ) : (
        <span
          aria-hidden
          className={cn("size-1.5 rounded-full", TONE_DOT[resolvedTone])}
        />
      )}
      {label ?? meta.label}
    </span>
  );
}
