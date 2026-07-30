/**
 * Canvas derivation.
 *
 * The backend owns scoring and analysis; this module only reshapes the
 * structured report into the view models the canvas renders. Everything here
 * is deterministic and pure so the same report always produces the same
 * canvas — no model calls, no randomness, no hidden state.
 */

import type {
  ReportExperiment,
  ReportRisk,
  ReportScores,
  StructuredReport,
} from "@/lib/report-types";
import type { StartupPayload } from "@/lib/types";

export type DecisionTone = "proceed" | "narrow" | "investigate" | "reconsider";

export interface CanvasDecision {
  tone: DecisionTone;
  label: string;
  overall: number;
  confidence?: number;
  summary: string;
  /** Concrete conditions that would move the recommendation. */
  changeConditions: string[];
}

export interface ThesisCard {
  key: string;
  label: string;
  value: string;
  /** Whether the founder asserted this or Scout inferred it from evidence. */
  origin: "founder" | "scout";
}

export type AssumptionStatus =
  | "untested"
  | "testing"
  | "supported"
  | "contradicted"
  | "inconclusive";

export interface CanvasAssumption {
  id: string;
  title: string;
  kind: "risk" | "objection";
  /** Why this matters — the risk reason or the objection's stakes. */
  why?: string;
  /** Evidence Scout found, or the strongest available answer. */
  evidence?: string;
  /** Suggested mitigation or answer. */
  response?: string;
  /** Index into the derived experiment list, when one plausibly tests this. */
  experimentId?: string;
}

export interface CanvasExperiment {
  id: string;
  name: string;
  goal?: string;
  method?: string;
  successCriteria?: string;
  failureCriteria?: string;
  time?: string;
  cost?: string;
}

export interface EvidenceItem {
  text: string;
  origin: string;
}

export interface CanvasEvidence {
  supporting: EvidenceItem[];
  contradicting: EvidenceItem[];
  unknown: EvidenceItem[];
}

export interface CanvasDimension {
  key: string;
  label: string;
  score: number;
  rationale?: string;
  evidence?: string;
  /** 1-6, maps to the --chart-N analytical palette. */
  chartIndex: number;
}

export interface AnalystNote {
  agent: string;
  label: string;
  note: string;
}

export interface StartupCanvasModel {
  decision: CanvasDecision;
  dimensions: CanvasDimension[];
  thesis: ThesisCard[];
  assumptions: CanvasAssumption[];
  experiments: CanvasExperiment[];
  evidence: CanvasEvidence;
  analystNotes: AnalystNote[];
  scoreExplanation?: string;
}

const DECISION_BANDS: {
  min: number;
  tone: DecisionTone;
  label: string;
  summary: string;
}[] = [
  {
    min: 70,
    tone: "proceed",
    label: "Proceed",
    summary:
      "The evidence supports building. Move to validation experiments with real customers before committing to scope.",
  },
  {
    min: 50,
    tone: "narrow",
    label: "Narrow the focus",
    summary:
      "The idea holds up in parts. Tighten the customer or the wedge before investing build time.",
  },
  {
    min: 35,
    tone: "investigate",
    label: "Investigate further",
    summary:
      "Too much rests on untested assumptions. Run the cheapest experiments below before deciding.",
  },
  {
    min: 0,
    tone: "reconsider",
    label: "Reconsider",
    summary:
      "The research surfaced problems serious enough to rethink the premise, the customer, or the timing.",
  },
];

function clean(value?: string | null): string | undefined {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function weakestDimensions(report: StructuredReport, count: number): string[] {
  const scores = report.scores;
  if (!scores) return [];
  const entries: { label: string; score: number }[] = [
    { label: "market", score: scores.market?.score ?? -1 },
    { label: "competition", score: scores.competition?.score ?? -1 },
    { label: "distribution", score: scores.distribution?.score ?? -1 },
    { label: "execution", score: scores.execution?.score ?? -1 },
    { label: "timing", score: scores.timing?.score ?? -1 },
    { label: "monetization", score: scores.monetization?.score ?? -1 },
  ];
  return entries
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => left.score - right.score)
    .slice(0, count)
    .map((entry) => entry.label);
}

/**
 * The recommendation is only useful if the founder knows what would move it.
 * These conditions are read off the weakest dimensions and the top risks
 * rather than invented, so each one maps to something Scout actually measured.
 */
function buildChangeConditions(report: StructuredReport): string[] {
  const conditions: string[] = [];
  const weakest = weakestDimensions(report, 2);

  for (const dimension of weakest) {
    conditions.push(`Hard evidence that ${dimension} is stronger than scored`);
  }

  for (const risk of (report.risks ?? []).slice(0, 2)) {
    const name = clean(risk.name);
    if (name) conditions.push(`Disproving the risk: ${name.toLowerCase()}`);
  }

  const objection = clean(report.yc_objections?.[0]?.question);
  if (objection) conditions.push(`A credible answer to: ${objection}`);

  return conditions.slice(0, 4);
}

export function deriveDecision(report: StructuredReport): CanvasDecision {
  const overall = report.scores?.overall ?? 0;
  const band =
    DECISION_BANDS.find((candidate) => overall >= candidate.min) ??
    DECISION_BANDS[DECISION_BANDS.length - 1];

  return {
    tone: band.tone,
    label: band.label,
    overall,
    confidence: report.confidence,
    summary:
      clean(report.investment_recommendation) ??
      clean(report.verdict) ??
      band.summary,
    changeConditions: buildChangeConditions(report),
  };
}

/**
 * The thesis is the founder's own framing, backfilled by Scout where the
 * composer was left blank. Origin is tracked so the UI can be honest about
 * which lines are asserted and which are inferred.
 */
export function deriveThesis(
  report: StructuredReport,
  payload?: StartupPayload,
): ThesisCard[] {
  const gtm = report.gtm_strategy;
  const pain = report.customer_pain;

  const candidates: (ThesisCard | undefined)[] = [
    thesisCard("problem", "Problem", payload?.problem, pain?.why_users_switch),
    thesisCard(
      "customer",
      "Early adopter",
      payload?.target_customer,
      gtm?.first_customer,
    ),
    thesisCard(
      "solution",
      "Solution",
      payload?.proposed_solution,
      report.moat_analysis?.realistic_moat,
    ),
    thesisCard(
      "alternatives",
      "Today's alternative",
      payload?.current_alternatives?.join(", "),
      pain?.current_workarounds?.join(", "),
    ),
    thesisCard("pricing", "Pricing", payload?.pricing_hypothesis, gtm?.pricing),
    thesisCard(
      "distribution",
      "Distribution",
      payload?.gtm_constraints,
      gtm?.acquisition_channels?.join(", "),
    ),
  ];

  return candidates.filter((card): card is ThesisCard => card !== undefined);
}

function thesisCard(
  key: string,
  label: string,
  founderValue?: string,
  scoutValue?: string,
): ThesisCard | undefined {
  const founder = clean(founderValue);
  if (founder) return { key, label, value: founder, origin: "founder" };
  const scout = clean(scoutValue);
  if (scout) return { key, label, value: scout, origin: "scout" };
  return undefined;
}

export function deriveExperiments(report: StructuredReport): CanvasExperiment[] {
  return (report.experiments ?? [])
    .map((experiment, index) => toCanvasExperiment(experiment, index))
    .filter((experiment): experiment is CanvasExperiment => experiment !== undefined);
}

function toCanvasExperiment(
  experiment: ReportExperiment,
  index: number,
): CanvasExperiment | undefined {
  const name = clean(experiment.name) ?? clean(experiment.goal);
  if (!name) return undefined;
  return {
    id: `experiment-${index}`,
    name,
    goal: clean(experiment.goal),
    method: clean(experiment.method),
    successCriteria: clean(experiment.success_criteria),
    failureCriteria: clean(experiment.failure_criteria),
    time: clean(experiment.time),
    cost: clean(experiment.cost),
  };
}

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "for", "with", "without", "that",
  "this", "these", "those", "will", "would", "could", "should", "can", "may",
  "are", "was", "were", "has", "have", "had", "not", "from", "into", "than",
  "then", "there", "their", "them", "they", "you", "your", "our", "its", "it",
  "of", "to", "in", "on", "at", "by", "is", "be", "as", "if", "do", "does",
]);

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token)),
  );
}

/**
 * Link an open question to the experiment most likely to settle it using
 * token overlap. This is intentionally a heuristic, not a model call: a wrong
 * link is cheap to override in the UI, and determinism keeps the canvas stable
 * across re-renders.
 */
function bestExperimentMatch(
  text: string,
  experiments: CanvasExperiment[],
): string | undefined {
  const needle = tokenize(text);
  if (needle.size === 0) return undefined;

  let bestId: string | undefined;
  let bestScore = 0;

  for (const experiment of experiments) {
    const haystack = tokenize(
      [experiment.name, experiment.goal, experiment.method]
        .filter(Boolean)
        .join(" "),
    );
    let overlap = 0;
    for (const token of needle) if (haystack.has(token)) overlap += 1;
    if (overlap > bestScore) {
      bestScore = overlap;
      bestId = experiment.id;
    }
  }

  // Require two shared meaningful tokens so unrelated pairs stay unlinked.
  return bestScore >= 2 ? bestId : undefined;
}

export function deriveAssumptions(
  report: StructuredReport,
  experiments: CanvasExperiment[],
): CanvasAssumption[] {
  const assumptions: CanvasAssumption[] = [];

  (report.risks ?? []).forEach((risk: ReportRisk, index) => {
    const title = clean(risk.name);
    if (!title) return;
    assumptions.push({
      id: `risk-${index}`,
      kind: "risk",
      title,
      why: clean(risk.reason),
      evidence: clean(risk.evidence),
      response: clean(risk.mitigation),
      experimentId: bestExperimentMatch(
        [title, risk.reason].filter(Boolean).join(" "),
        experiments,
      ),
    });
  });

  (report.yc_objections ?? []).forEach((objection, index) => {
    const title = clean(objection.question);
    if (!title) return;
    assumptions.push({
      id: `objection-${index}`,
      kind: "objection",
      title,
      why: clean(objection.why_it_matters),
      response: clean(objection.best_answer),
      experimentId: bestExperimentMatch(
        [title, objection.why_it_matters].filter(Boolean).join(" "),
        experiments,
      ),
    });
  });

  return assumptions;
}

export function deriveEvidence(report: StructuredReport): CanvasEvidence {
  const supporting: EvidenceItem[] = [];
  const contradicting: EvidenceItem[] = [];
  const unknown: EvidenceItem[] = [];

  for (const opportunity of report.opportunities ?? []) {
    const text = clean(opportunity);
    if (text) supporting.push({ text, origin: "VC partner" });
  }
  for (const trend of report.market_analysis?.trends ?? []) {
    const text = clean(trend);
    if (text) supporting.push({ text, origin: "Market analyst" });
  }
  for (const trigger of report.customer_pain?.switching_triggers ?? []) {
    const text = clean(trigger);
    if (text) supporting.push({ text, origin: "Customer analyst" });
  }

  for (const risk of report.risks ?? []) {
    const text = clean(risk.reason) ?? clean(risk.name);
    if (text) contradicting.push({ text, origin: clean(risk.name) ?? "Risk" });
  }
  const notWon = clean(report.market_analysis?.why_not_already_won);
  if (notWon) {
    contradicting.push({ text: notWon, origin: "Why not already won" });
  }

  for (const objection of report.yc_objections ?? []) {
    const text = clean(objection.question);
    if (text) unknown.push({ text, origin: "VC partner" });
  }
  for (const workaround of report.customer_pain?.current_workarounds ?? []) {
    const text = clean(workaround);
    if (text) unknown.push({ text, origin: "Current workaround" });
  }

  return { supporting, contradicting, unknown };
}

/**
 * Fixed order and colour assignment for the six scored dimensions. The order is
 * the radar's axis order, so it must stay stable — a chart whose axes move
 * between runs cannot be compared against itself.
 */
const DIMENSION_ORDER: { key: keyof ReportScores; label: string }[] = [
  { key: "market", label: "Market" },
  { key: "competition", label: "Competition" },
  { key: "distribution", label: "Distribution" },
  { key: "execution", label: "Execution" },
  { key: "timing", label: "Timing" },
  { key: "monetization", label: "Monetization" },
];

export function deriveDimensions(report: StructuredReport): CanvasDimension[] {
  const scores = report.scores;
  if (!scores) return [];

  const dimensions: CanvasDimension[] = [];
  DIMENSION_ORDER.forEach((entry, index) => {
    const dimension = scores[entry.key];
    if (typeof dimension !== "object" || dimension === null) return;
    dimensions.push({
      key: String(entry.key),
      label: entry.label,
      score: Math.max(0, Math.min(10, dimension.score ?? 0)),
      rationale: clean(dimension.rationale),
      evidence: clean(dimension.evidence),
      chartIndex: index + 1,
    });
  });
  return dimensions;
}

const AGENT_LABELS: Record<string, string> = {
  market_analyst: "Market Analyst",
  competitor_analyst: "Competitor Analyst",
  customer_analyst: "Customer Analyst",
  gtm_agent: "GTM Agent",
  vc_partner: "VC Partner",
  moat_agent: "Moat Agent",
  experiment_agent: "Experiment Agent",
  synthesizer: "Synthesis",
};

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Each specialist's own summary. These used to be visible only inside the
 * Markdown report; with the report view gone they surface here so removing it
 * costs the founder nothing.
 */
export function deriveAnalystNotes(report: StructuredReport): AnalystNote[] {
  const notes = report.agent_notes ?? {};
  return Object.entries(notes)
    .map(([agent, note]) => ({
      agent,
      label: AGENT_LABELS[agent] ?? titleCase(agent),
      note: clean(note) ?? "",
    }))
    .filter((entry) => entry.note.length > 0);
}

export function buildCanvasModel(
  report: StructuredReport,
  payload?: StartupPayload,
): StartupCanvasModel {
  const experiments = deriveExperiments(report);
  return {
    decision: deriveDecision(report),
    dimensions: deriveDimensions(report),
    thesis: deriveThesis(report, payload),
    assumptions: deriveAssumptions(report, experiments),
    experiments,
    evidence: deriveEvidence(report),
    analystNotes: deriveAnalystNotes(report),
    scoreExplanation: clean(report.score_explanation),
  };
}
