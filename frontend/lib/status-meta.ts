/**
 * One source of truth for how a persisted run status looks in the UI.
 *
 * The projects list, the project detail timeline, and the active-run header all
 * render the same five states, so the vocabulary (label, tone, colour) lives
 * here instead of being re-invented per screen.
 */

import type { ResearchRunStatus } from "@/lib/scout-api";

export type StatusTone = "neutral" | "live" | "success" | "warning" | "danger";

export interface StatusMeta {
  label: string;
  tone: StatusTone;
  /** True while the backend may still be producing events. */
  active: boolean;
  description: string;
}

const META: Record<ResearchRunStatus, StatusMeta> = {
  queued: {
    label: "Queued",
    tone: "neutral",
    active: true,
    description: "Waiting to start.",
  },
  running: {
    label: "Researching",
    tone: "live",
    active: true,
    description: "Searches and specialists are still working.",
  },
  completed: {
    label: "Completed",
    tone: "success",
    active: false,
    description: "A scored report version was saved.",
  },
  failed: {
    label: "Failed",
    tone: "danger",
    active: false,
    description: "Stopped on an error. Completed stages can be reused.",
  },
  cancelled: {
    label: "Cancelled",
    tone: "warning",
    active: false,
    description: "Interrupted before synthesis finished.",
  },
};

const FALLBACK: StatusMeta = {
  label: "No runs",
  tone: "neutral",
  active: false,
  description: "This project has not been researched yet.",
};

export function statusMeta(status?: ResearchRunStatus | null): StatusMeta {
  if (!status) return FALLBACK;
  return META[status] ?? FALLBACK;
}

/** Chip styling per tone — border, tinted ground, and readable text. */
export const TONE_CHIP: Record<StatusTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  live: "border-brand/35 bg-brand-muted text-brand",
  success: "border-success/30 bg-success-muted text-success",
  warning: "border-warning/30 bg-warning-muted text-warning",
  danger: "border-destructive/30 bg-destructive-muted text-destructive",
};

/** Solid dot colour per tone, for timelines and compact rows. */
export const TONE_DOT: Record<StatusTone, string> = {
  neutral: "bg-border-strong",
  live: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
};

/**
 * The v2 graph is three phases wide: evidence gathering, a parallel specialist
 * fan-out, then synthesis. `checkpoint_stage` stores the last completed graph
 * node, which is either `evidence`, one of the seven specialist ids, or
 * `synthesizer` — so a checkpoint is mapped onto a phase rather than a step
 * index.
 */
export const RUN_PHASES = [
  { key: "evidence", label: "Evidence", detail: "Eight Tavily searches, deduplicated" },
  { key: "specialists", label: "Specialists", detail: "Seven role-specific analysts" },
  { key: "synthesizer", label: "Synthesis", detail: "Scored report and Markdown" },
] as const;

export type RunPhaseKey = (typeof RUN_PHASES)[number]["key"];

const SPECIALIST_STAGES = new Set([
  "market_analyst",
  "competitor_analyst",
  "customer_analyst",
  "gtm_agent",
  "vc_partner",
  "moat_agent",
  "experiment_agent",
]);

/** Index of the last *completed* phase, or -1 when nothing finished. */
export function phaseIndex(stage?: string | null) {
  if (!stage) return -1;
  if (stage === "evidence") return 0;
  if (SPECIALIST_STAGES.has(stage)) return 1;
  if (stage === "synthesizer") return 2;
  return -1;
}

export function stageLabel(stage?: string | null) {
  if (!stage) return "Not started";
  if (stage === "evidence") return "Evidence";
  if (stage === "synthesizer") return "Synthesis";
  return stage.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
