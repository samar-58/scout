"use client";

import { LocalTime } from "@/components/local-time";
import { THESIS_FIELD_LABELS, TIMELINE_KIND_LABELS } from "@/lib/loop-meta";
import type { ThesisVersionRecord, TimelineEntryRecord } from "@/lib/scout-api";
import { cn } from "@/lib/utils";

/**
 * The current thesis, with its version history.
 *
 * Each line records whether the founder asserted it, Scout inferred it, or a
 * confirmed decision changed it — so "why is this what we believe?" is answerable
 * from the canvas itself.
 */
export function ThesisPanel({
  versions,
  selectedVersion,
  onSelectVersion,
}: {
  versions: ThesisVersionRecord[];
  selectedVersion?: number;
  onSelectVersion: (version: number) => void;
}) {
  if (versions.length === 0) {
    return (
      <p className="border-y border-border py-6 text-[13px] text-muted-foreground">
        The thesis is written when the first research run completes.
      </p>
    );
  }

  const current =
    versions.find((version) => version.version === selectedVersion) ?? versions[0];
  const entries = THESIS_FIELD_LABELS.map((field) => ({
    ...field,
    entry: current.fields[field.key],
  })).filter((item) => item.entry?.value);

  return (
    <div>
      {versions.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          {versions.map((version) => (
            <button
              key={version.id}
              type="button"
              onClick={() => onSelectVersion(version.version)}
              className={cn(
                "h-7 rounded-md border px-2.5 text-[12.5px] transition-colors",
                version.version === current.version
                  ? "border-border-strong bg-muted font-medium"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              v{version.version}
            </button>
          ))}
          <span className="ml-1 text-[12px] text-muted-foreground">
            <LocalTime value={current.created_at} />
          </span>
        </div>
      )}

      <dl className="divide-y divide-border border-y border-border">
        {entries.map((item) => (
          <div key={item.key} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-5">
            <dt className="w-40 shrink-0 text-[12px] text-muted-foreground">
              {item.label}
            </dt>
            <dd className="min-w-0 flex-1 text-[13.5px] leading-relaxed [overflow-wrap:anywhere]">
              {item.entry.value}
              <span className="ml-2 text-[11.5px] text-subtle-foreground">
                {item.entry.origin === "founder"
                  ? "you"
                  : item.entry.origin === "decision"
                    ? "decision"
                    : "Scout"}
              </span>
            </dd>
          </div>
        ))}
      </dl>

      {current.change_note && (
        <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
          {current.change_note}
        </p>
      )}
    </div>
  );
}

const KIND_DOT: Record<string, string> = {
  run: "bg-border-strong",
  report: "bg-brand",
  experiment_started: "bg-brand",
  experiment_completed: "bg-success",
  observation: "bg-warning",
  decision: "bg-success",
  thesis_version: "bg-foreground",
};

/** Reports, experiments, evidence, decisions, and thesis changes in one column. */
export function LearningTimeline({ entries }: { entries: TimelineEntryRecord[] }) {
  if (entries.length === 0) {
    return (
      <p className="border-y border-border py-6 text-[13px] text-muted-foreground">
        Your learning history appears here as you run research and experiments.
      </p>
    );
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {entries.map((entry) => (
        <li key={`${entry.kind}-${entry.id}-${entry.at}`} className="relative">
          <span
            aria-hidden
            className={cn(
              "absolute top-1.5 -left-[1.4rem] size-1.5 rounded-full",
              KIND_DOT[entry.kind] ?? "bg-border-strong",
            )}
          />
          <p className="text-[13.5px] leading-snug font-medium [overflow-wrap:anywhere]">
            {entry.title}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {TIMELINE_KIND_LABELS[entry.kind] ?? entry.kind}
            {entry.status && <> · {entry.status}</>} ·{" "}
            <LocalTime value={entry.at} />
          </p>
          {entry.detail && (
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
              {entry.detail}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
