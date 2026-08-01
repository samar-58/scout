"use client";

import { ArrowRight, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { LivePulse } from "@/components/live-pulse";
import { Button } from "@/components/ui/button";
import type { LoopProgress } from "@/lib/loop-progress";
import { cn } from "@/lib/utils";

const STAT_TONE: Record<string, string> = {
  neutral: "text-foreground",
  live: "text-brand",
  success: "text-success",
  warning: "text-warning",
};

/**
 * The loop header: where this project is, and the one thing to do next.
 *
 * The five-step tracker is the product thesis made visible — research becomes
 * assumptions, assumptions become experiments, experiments become evidence, and
 * evidence becomes a decision. The primary action is derived from state, so the
 * founder never has to work out which board to open.
 */
export function LoopHeader({
  progress,
  onRunSprint,
  onNavigate,
  busy,
}: {
  progress: LoopProgress;
  onRunSprint: () => void;
  onNavigate: (sectionId: string) => void;
  busy?: string;
}) {
  const { nextAction, steps, stats } = progress;
  const buildingSprint = busy === "sprint";
  const isResearchAction =
    nextAction.kind === "research" || nextAction.kind === "next-cycle";

  return (
    <section className="panel overflow-hidden">
      {/* Stage tracker */}
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2 border-b border-border px-4 py-3 sm:px-5">
        {steps.map((step, index) => (
          <li key={step.key} className="flex items-center gap-1.5">
            {index > 0 && (
              <span
                aria-hidden
                className={cn(
                  "mr-1.5 hidden h-px w-5 sm:block",
                  step.done ? "bg-border-strong" : "bg-border",
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "grid size-4 shrink-0 place-items-center rounded-full border text-[9px]",
                step.done
                  ? "border-foreground bg-foreground text-background"
                  : step.current
                    ? "border-brand text-brand"
                    : "border-border text-subtle-foreground",
              )}
            >
              {step.done ? <Check className="size-2.5" /> : index + 1}
            </span>
            <span
              className={cn(
                "text-[12.5px]",
                step.current
                  ? "font-medium text-foreground"
                  : step.done
                    ? "text-muted-foreground"
                    : "text-subtle-foreground",
              )}
            >
              {step.label}
              {step.current && <span className="sr-only"> (current step)</span>}
            </span>
          </li>
        ))}
      </ol>

      {/* Next action */}
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13.5px] font-medium">
            {nextAction.kind === "record-results" && <LivePulse />}
            Next: {nextAction.label.toLowerCase()}
          </p>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
            {nextAction.hint}
          </p>
        </div>

        {isResearchAction ? (
          <Button asChild size="sm" className="shrink-0 gap-1.5">
            <Link href="/app">
              {nextAction.label}
              <ArrowRight size={13} />
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="shrink-0 gap-1.5"
            disabled={buildingSprint}
            onClick={() => {
              if (nextAction.runsSprint) onRunSprint();
              else if (nextAction.targetId) onNavigate(nextAction.targetId);
            }}
          >
            {buildingSprint ? (
              <>
                <Loader2 size={13} className="spin" /> Building sprint
              </>
            ) : (
              <>
                {nextAction.label}
                <ArrowRight size={13} />
              </>
            )}
          </Button>
        )}
      </div>

      {/* Loop counters */}
      <dl className="grid grid-cols-2 border-t border-border sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat, index) => (
          <div
            key={stat.key}
            className={cn(
              "border-border px-4 py-3 sm:px-5",
              index > 0 && "border-l",
              index >= 2 && "border-t sm:border-t-0",
              index === 1 && "sm:border-l",
              // Reset the left rule at each row start so cells align on mobile.
              index % 2 === 0 && "border-l-0 sm:border-l",
              index === 0 && "sm:border-l-0",
            )}
          >
            <dt className="text-[11.5px] text-muted-foreground">{stat.label}</dt>
            <dd
              className={cn(
                "mt-0.5 font-serif text-[1.35rem] leading-none font-semibold tabular-nums",
                STAT_TONE[stat.tone ?? "neutral"],
              )}
            >
              {stat.value}
            </dd>
            {stat.hint && (
              <p className="mt-1 text-[11.5px] text-subtle-foreground">{stat.hint}</p>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}
