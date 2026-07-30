/**
 * Run phase derivation.
 *
 * A run takes minutes, and two progress bars do not tell a founder where the
 * work actually is. This maps the raw event stream onto the four stages of the
 * v2 graph — search, analyse, synthesise, report — so the wait is bounded and
 * legible. Pure and deterministic; the UI owns no phase state of its own.
 */

import type { AgentEvent, SearchEvent } from "@/lib/types";

export type RunPhaseId =
  | "queueing"
  | "searching"
  | "routing"
  | "analysing"
  | "writing"
  | "complete";

export const RUN_STEPS = ["Search", "Analyse", "Synthesise", "Report"] as const;

export interface RunPhase {
  id: RunPhaseId;
  label: string;
  detail: string;
  /** Index into RUN_STEPS for the stepper. */
  stepIndex: number;
}

const TERMINAL_STATUSES = new Set(["completed", "failed"]);

function isSettled(agent: AgentEvent) {
  return TERMINAL_STATUSES.has(agent.status);
}

export function deriveRunPhase({
  agents,
  searches,
  isRunning,
  hasReport,
}: {
  agents: AgentEvent[];
  searches: SearchEvent[];
  isRunning: boolean;
  hasReport: boolean;
}): RunPhase {
  const searchesDone = searches.filter(
    (search) => search.status === "completed",
  ).length;
  const searchTotal = searches.length || 8;
  const agentsDone = agents.filter((agent) => isSettled(agent)).length;
  const agentTotal = agents.length || 7;

  if (hasReport || (!isRunning && agentsDone === agentTotal && agentTotal > 0)) {
    return {
      id: "complete",
      label: "Research complete",
      detail: `${searchesDone} searches · ${agentsDone} specialists reported`,
      stepIndex: 3,
    };
  }

  if (searches.length === 0) {
    return {
      id: "queueing",
      label: "Planning the research",
      detail: "Building eight topic-specific queries from your context",
      stepIndex: 0,
    };
  }

  if (agentTotal > 0 && agents.every(isSettled)) {
    return {
      id: "writing",
      label: "Writing the report",
      detail: "Reconciling seven specialists into one scored recommendation",
      stepIndex: 2,
    };
  }

  if (agents.some((agent) => agent.status === "running")) {
    return {
      id: "analysing",
      label: "Specialists analysing evidence",
      detail: `${agentsDone} of ${agentTotal} specialists have reported`,
      stepIndex: 1,
    };
  }

  if (searches.some((search) => search.status === "running")) {
    return {
      id: "searching",
      label: "Searching the web",
      detail: `${searchesDone} of ${searchTotal} searches complete`,
      stepIndex: 0,
    };
  }

  return {
    id: "routing",
    label: "Routing evidence to specialists",
    detail: `${searchesDone} of ${searchTotal} searches returned usable evidence`,
    stepIndex: 1,
  };
}

/** m:ss for a calm, glanceable elapsed readout. */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
