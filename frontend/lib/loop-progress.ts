/**
 * Loop progress derivation.
 *
 * Pure and deterministic: given the persisted records, decide where the founder
 * is in the loop and what the single most useful next move is. Keeping this out
 * of the component means the "what do I do now?" logic is testable and cannot
 * drift between the header and the boards.
 */

import type {
  AssumptionRecord,
  DecisionRecord,
  ExperimentRecord,
  ThesisVersionRecord,
} from "@/lib/scout-api";

export type NextActionKind =
  | "research"
  | "review-assumptions"
  | "build-sprint"
  | "record-results"
  | "review-results"
  | "confirm-decision"
  | "next-cycle";

export interface LoopStep {
  key: string;
  label: string;
  done: boolean;
  current: boolean;
}

export interface LoopStat {
  key: string;
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "live" | "success" | "warning";
}

export interface LoopNextAction {
  kind: NextActionKind;
  label: string;
  hint: string;
  /** Section to scroll to, when the action is a place rather than a command. */
  targetId?: string;
  /** True when the action is the sprint command the header can run directly. */
  runsSprint?: boolean;
}

export interface LoopProgress {
  steps: LoopStep[];
  stats: LoopStat[];
  nextAction: LoopNextAction;
  openAssumptionIds: string[];
}

const OPEN_STATUSES = ["untested", "testing", "inconclusive"];

export function openAssumptions(assumptions: AssumptionRecord[]) {
  return assumptions.filter(
    (assumption) =>
      assumption.review_state !== "rejected" &&
      OPEN_STATUSES.includes(assumption.status),
  );
}

export function deriveLoopProgress({
  assumptions,
  experiments,
  decisions,
  thesisVersions,
}: {
  assumptions: AssumptionRecord[];
  experiments: ExperimentRecord[];
  decisions: DecisionRecord[];
  thesisVersions: ThesisVersionRecord[];
}): LoopProgress {
  const open = openAssumptions(assumptions);
  const reviewed = assumptions.filter(
    (assumption) => assumption.review_state !== "proposed",
  );
  const active = experiments.filter((experiment) =>
    ["planned", "running"].includes(experiment.status),
  );
  const observationCount = experiments.reduce(
    (total, experiment) => total + experiment.observations.length,
    0,
  );
  const awaitingReview = experiments.filter(
    (experiment) =>
      experiment.status === "running" &&
      experiment.observations.length > 0 &&
      experiment.result === null,
  );
  const needsResults = active.filter(
    (experiment) => experiment.observations.length === 0,
  );
  const pending = decisions.filter((decision) => decision.status === "proposed");
  const confirmed = decisions.filter((decision) => decision.status === "confirmed");

  const milestones = {
    researched: assumptions.length > 0,
    reviewed: reviewed.length > 0,
    planned: experiments.some((experiment) => experiment.status !== "suggested"),
    evidenced: observationCount > 0,
    decided: confirmed.length > 0,
  };

  const steps: LoopStep[] = [
    { key: "research", label: "Research", done: milestones.researched },
    { key: "assumptions", label: "Assumptions", done: milestones.reviewed },
    { key: "experiments", label: "Experiments", done: milestones.planned },
    { key: "evidence", label: "Evidence", done: milestones.evidenced },
    { key: "decision", label: "Decision", done: milestones.decided },
  ].map((step, index, all) => ({
    ...step,
    // The current step is the first unfinished one; a fully closed loop marks
    // the last step current so the tracker never looks abandoned.
    current: !step.done && all.slice(0, index).every((earlier) => earlier.done),
  }));
  if (steps.every((step) => step.done)) {
    steps[steps.length - 1] = { ...steps[steps.length - 1], current: true };
  }

  const stats: LoopStat[] = [
    {
      key: "assumptions",
      label: "Open assumptions",
      value: String(open.length),
      hint: `${assumptions.length} total`,
      tone: open.length > 0 ? "neutral" : "success",
    },
    {
      key: "experiments",
      label: "Active experiments",
      value: String(active.length),
      hint: `${experiments.length} total`,
      tone: active.length > 0 ? "live" : "neutral",
    },
    {
      key: "evidence",
      label: "Observations",
      value: String(observationCount),
      hint: observationCount === 0 ? "none recorded" : "from the field",
      tone: observationCount > 0 ? "success" : "neutral",
    },
    {
      key: "decisions",
      label: "Awaiting you",
      value: String(pending.length),
      hint: `${confirmed.length} confirmed`,
      tone: pending.length > 0 ? "warning" : "neutral",
    },
    {
      key: "thesis",
      label: "Thesis version",
      value: thesisVersions.length ? `v${thesisVersions[0].version}` : "—",
      hint: thesisVersions.length > 1 ? `${thesisVersions.length} versions` : "initial",
      tone: "neutral",
    },
  ];

  const nextAction = ((): LoopNextAction => {
    if (pending.length > 0) {
      return {
        kind: "confirm-decision",
        label: "Review the decision",
        hint: `Scout proposed ${pending.length === 1 ? "a change" : `${pending.length} changes`} from your evidence. Nothing moves until you confirm.`,
        targetId: "decisions",
      };
    }
    if (awaitingReview.length > 0) {
      return {
        kind: "review-results",
        label: "Review results",
        hint: "You recorded results. Ask Scout whether the assumption held.",
        targetId: "experiments",
      };
    }
    if (needsResults.length > 0) {
      return {
        kind: "record-results",
        label: "Record what happened",
        hint: `${needsResults.length === 1 ? "An experiment is" : `${needsResults.length} experiments are`} waiting on results from the field.`,
        targetId: "experiments",
      };
    }
    if (assumptions.length === 0) {
      return {
        kind: "research",
        label: "Run research",
        hint: "A completed research run creates the assumptions this loop tests.",
      };
    }
    if (open.length > 0) {
      return {
        kind: "build-sprint",
        label: "Build my validation sprint",
        hint: `${open.length} open assumption${open.length === 1 ? "" : "s"}. Scout will turn the riskiest into experiments you can run this week.`,
        targetId: "assumptions",
        runsSprint: true,
      };
    }
    return {
      kind: "next-cycle",
      label: "Run new research",
      hint: "Every assumption is settled. Re-run research against the updated thesis to find the next risk.",
    };
  })();

  return {
    steps,
    stats,
    nextAction,
    openAssumptionIds: open.map((assumption) => assumption.id),
  };
}
