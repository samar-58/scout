"use client";

import { LocalTime } from "@/components/local-time";
import {
  classifyThesisField,
  THESIS_FIELD_LABELS,
  TIMELINE_KIND_LABELS,
} from "@/lib/loop-meta";
import type {
  ClaimRecord,
  ThesisVersionRecord,
  TimelineEntryRecord,
} from "@/lib/scout-api";
import { cn } from "@/lib/utils";

/**
 * The current thesis, with its version history.
 *
 * Each line records whether the founder asserted it, Scout inferred it, or a
 * confirmed decision changed it — so "why is this what we believe?" is answerable
 * from the canvas itself. Challenge scrolls to assumptions; edits only happen
 * through confirmed decisions.
 */
export function ThesisPanel({
  versions,
  selectedVersion,
  onSelectVersion,
  claims,
  onChallengeField,
  highlightCategory,
}: {
  versions: ThesisVersionRecord[];
  selectedVersion?: number;
  onSelectVersion: (version: number) => void;
  claims?: ClaimRecord[];
  onChallengeField?: (fieldKey: string) => void;
  highlightCategory?: string;
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

  const projectCounts = claimStanceTotals(claims);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {versions.length > 1 &&
          versions.map((version) => (
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
        <span className="text-[12px] text-muted-foreground">
          {versions.length === 1 ? "v1 · " : null}
          Updated <LocalTime value={current.created_at} />
        </span>
      </div>

      <div className="divide-y divide-border border-y border-border">
        {entries.map((item) => {
          const counts = claimCountsForField(item.key, claims);
          const challenged = highlightCategory === item.key;
          return (
            <div
              key={item.key}
              className={cn(
                "flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-5",
                challenged && "bg-muted/50",
              )}
            >
              <div className="w-40 shrink-0">
                <p className="text-[12px] text-muted-foreground">{item.label}</p>
                {(counts.supporting > 0 || counts.contradicting > 0) && (
                  <p className="mt-1 text-[11.5px] text-muted-foreground">
                    {counts.supporting > 0 && (
                      <span className="text-success">
                        {counts.supporting} for
                      </span>
                    )}
                    {counts.supporting > 0 && counts.contradicting > 0 && " · "}
                    {counts.contradicting > 0 && (
                      <span className="text-destructive">
                        {counts.contradicting} against
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] leading-relaxed [overflow-wrap:anywhere]">
                  {item.entry.value}
                  <span className="ml-2 text-[11.5px] text-subtle-foreground">
                    {item.entry.origin === "founder"
                      ? "you"
                      : item.entry.origin === "decision"
                        ? "decision"
                        : "Scout"}
                  </span>
                </p>
                {onChallengeField && (
                  <button
                    type="button"
                    onClick={() => onChallengeField(item.key)}
                    className="mt-1.5 text-[12.5px] font-medium text-foreground underline underline-offset-4 hover:text-brand"
                  >
                    Challenge
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(projectCounts.supporting > 0 ||
        projectCounts.contradicting > 0 ||
        projectCounts.unknown > 0) && (
        <p className="mt-3 text-[12px] text-muted-foreground">
          Project evidence: {projectCounts.supporting} supporting ·{" "}
          {projectCounts.contradicting} contradicting · {projectCounts.unknown}{" "}
          unknown
        </p>
      )}

      {current.change_note && (
        <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
          {current.change_note}
        </p>
      )}
    </div>
  );
}

function claimStanceTotals(claims: ClaimRecord[] | undefined) {
  let supporting = 0;
  let contradicting = 0;
  let unknown = 0;
  for (const claim of claims ?? []) {
    if (claim.stance === "supporting" || claim.stance === "pain") supporting += 1;
    else if (claim.stance === "contradicting" || claim.stance === "competitor") {
      contradicting += 1;
    } else unknown += 1;
  }
  return { supporting, contradicting, unknown };
}

function claimCountsForField(
  fieldKey: string,
  claims: ClaimRecord[] | undefined,
) {
  let supporting = 0;
  let contradicting = 0;
  for (const claim of claims ?? []) {
    if (classifyThesisField(claim.text) !== fieldKey) continue;
    if (claim.stance === "supporting" || claim.stance === "pain") supporting += 1;
    else if (claim.stance === "contradicting" || claim.stance === "competitor") {
      contradicting += 1;
    }
  }
  return { supporting, contradicting };
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
