"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { CanvasSection } from "@/components/canvas/canvas-section";
import { AssumptionList } from "@/components/loop/assumption-list";
import { DecisionCard } from "@/components/loop/decision-card";
import { ExperimentCard } from "@/components/loop/experiment-card";
import { LoopHeader } from "@/components/loop/loop-header";
import { LearningTimeline, ThesisPanel } from "@/components/loop/thesis-panel";
import { Button } from "@/components/ui/button";
import type { ValidationLoopState } from "@/hooks/use-validation-loop";
import { plural } from "@/lib/format";
import { EXPERIMENT_COLUMNS } from "@/lib/loop-meta";
import { deriveLoopProgress } from "@/lib/loop-progress";

function scrollToSection(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  const top = target.getBoundingClientRect().top + window.scrollY - 76;
  window.scrollTo({ top, behavior: "smooth" });
}

/**
 * The validation workspace: the loop the product exists to run.
 *
 * Research produces assumptions; the founder accepts or rewrites them; Scout
 * turns the open ones into a sprint; the founder runs the work outside Scout and
 * records what happened; Scout reviews it and proposes a decision; the founder
 * confirms, which is the only thing that changes the thesis.
 */
export function ValidationWorkspace({ loop }: { loop: ValidationLoopState }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [thesisVersion, setThesisVersion] = useState<number>();
  const [highlightCategory, setHighlightCategory] = useState<string>();

  const progress = useMemo(
    () =>
      deriveLoopProgress({
        assumptions: loop.assumptions,
        experiments: loop.experiments,
        decisions: loop.decisions,
        thesisVersions: loop.thesisVersions,
      }),
    [loop.assumptions, loop.experiments, loop.decisions, loop.thesisVersions],
  );

  const openAssumptionIds = progress.openAssumptionIds;
  const sprintTargets = selectedIds.length
    ? selectedIds
    : openAssumptionIds.slice(0, 3);
  const pendingDecisions = loop.decisions.filter(
    (decision) => decision.status === "proposed",
  );
  const settledDecisions = loop.decisions.filter(
    (decision) => decision.status !== "proposed",
  );
  const buildingSprint = loop.busy === "sprint";

  function runSprint(ids: string[]) {
    if (ids.length === 0) return;
    void loop.buildSprint(ids);
    setSelectedIds([]);
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : current.length >= 3
          ? current
          : [...current, id],
    );
  }

  if (loop.loading) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {loop.error && (
        <p
          role="alert"
          className="mb-4 border-l-2 border-destructive pl-3 text-[13px] text-destructive"
        >
          {loop.error}
        </p>
      )}
      {loop.notice && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-l-2 border-border-strong pl-3">
          <p className="flex items-center gap-2 text-[13px]">
            <Sparkles size={13} />
            {loop.notice}
          </p>
          <button
            type="button"
            onClick={loop.dismissNotice}
            className="text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <LoopHeader
        progress={progress}
        onRunSprint={() => runSprint(sprintTargets)}
        onNavigate={scrollToSection}
        busy={loop.busy}
      />

      <CanvasSection
        id="thesis"
        eyebrow="Thesis"
        title="What we currently believe"
        description="Versioned. Only a confirmed decision changes a line here."
      >
        <ThesisPanel
          versions={loop.thesisVersions}
          selectedVersion={thesisVersion}
          onSelectVersion={setThesisVersion}
          claims={loop.claims}
          highlightCategory={highlightCategory}
          onChallengeField={(fieldKey) => {
            setHighlightCategory(fieldKey);
            scrollToSection("assumptions");
          }}
        />
      </CanvasSection>

      <CanvasSection
        id="assumptions"
        eyebrow="Assumptions"
        title="What has to be true"
        description="Research cannot settle these — only customers can. Accept, rewrite, or reject each one, then test the riskiest."
        action={
          openAssumptionIds.length > 0 ? (
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              disabled={buildingSprint || sprintTargets.length === 0}
              onClick={() => runSprint(sprintTargets)}
            >
              {buildingSprint ? (
                <>
                  <Loader2 size={13} className="spin" /> Building sprint
                </>
              ) : (
                <>
                  Build my validation sprint
                  <span className="text-[11.5px] opacity-75">
                    {sprintTargets.length}
                  </span>
                </>
              )}
            </Button>
          ) : undefined
        }
      >
        <AssumptionList
          assumptions={loop.assumptions}
          experiments={loop.experiments}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onReview={(id, review) => void loop.reviewAssumptionField(id, review)}
          busy={loop.busy}
          highlightCategory={highlightCategory}
        />
        {openAssumptionIds.length > 0 && (
          <p className="mt-3 text-[12px] text-muted-foreground">
            {selectedIds.length > 0
              ? `Testing ${plural(selectedIds.length, "selected assumption")}.`
              : `No selection — Scout will test the ${plural(sprintTargets.length, "riskiest open assumption")}.`}
          </p>
        )}
      </CanvasSection>

      <CanvasSection
        id="experiments"
        eyebrow="Experiments"
        title="What we are testing"
        description="Run these outside Scout, then record what happened so the result becomes evidence."
      >
        {loop.experiments.length === 0 ? (
          <p className="border-y border-border py-6 text-[13px] text-muted-foreground">
            No experiments yet. Build a validation sprint from the assumptions above.
          </p>
        ) : (
          <div className="space-y-6">
            {EXPERIMENT_COLUMNS.map((column) => {
              const items = loop.experiments.filter(
                (experiment) => experiment.status === column.status,
              );
              if (items.length === 0) return null;
              return (
                <div key={column.status}>
                  <p className="label pb-2">
                    {column.label}
                    <span className="ml-1.5 tabular-nums text-subtle-foreground">
                      {items.length}
                    </span>
                  </p>
                  <ul className="space-y-2.5">
                    {items.map((experiment) => (
                      <ExperimentCard
                        key={experiment.id}
                        experiment={experiment}
                        onMove={(id, status) => void loop.moveExperiment(id, status)}
                        onRecordObservation={(id, observation) =>
                          void loop.recordObservation(id, observation)
                        }
                        onRequestReview={(id) => void loop.requestReview(id)}
                        busy={loop.busy}
                      />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </CanvasSection>

      <CanvasSection
        id="decisions"
        eyebrow="Decisions"
        title="What we decided, and why"
        description="Scout proposes after reviewing evidence. Nothing changes the thesis until you confirm it."
      >
        {loop.decisions.length === 0 ? (
          <p className="border-y border-border py-6 text-[13px] text-muted-foreground">
            Decisions appear after Scout reviews an experiment's results.
          </p>
        ) : (
          <div className="space-y-6">
            {pendingDecisions.length > 0 && (
              <div>
                <p className="label pb-2">
                  Awaiting your confirmation
                  <span className="ml-1.5 tabular-nums text-subtle-foreground">
                    {pendingDecisions.length}
                  </span>
                </p>
                <ul className="space-y-2.5">
                  {pendingDecisions.map((decision) => (
                    <DecisionCard
                      key={decision.id}
                      decision={decision}
                      onConfirm={(id, note) => void loop.confirm(id, note)}
                      onReject={(id, note) => void loop.reject(id, note)}
                      busy={loop.busy}
                    />
                  ))}
                </ul>
              </div>
            )}
            {settledDecisions.length > 0 && (
              <div>
                <p className="label pb-2">Decided</p>
                <ul className="space-y-2.5">
                  {settledDecisions.map((decision) => (
                    <DecisionCard
                      key={decision.id}
                      decision={decision}
                      onConfirm={(id, note) => void loop.confirm(id, note)}
                      onReject={(id, note) => void loop.reject(id, note)}
                      busy={loop.busy}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CanvasSection>

      <CanvasSection
        id="timeline"
        eyebrow="History"
        title="What we have learned"
        description="Every run, experiment, observation, decision, and thesis change, newest first."
      >
        <LearningTimeline entries={loop.timeline} />
      </CanvasSection>
    </div>
  );
}
