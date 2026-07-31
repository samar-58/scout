import type { StartupFormState, StartupPayload } from "@/lib/types";

export const initialFormState: StartupFormState = {
  idea: "",
  problem: "",
  targetCustomer: "",
  geography: "",
  businessModel: "",
  currentAlternatives: "",
  customerPain: "",
  proposedSolution: "",
  gtmConstraints: "",
  pricingHypothesis: "",
  stage: "",
  traction: "",
  teamContext: "",
  knownCompetitors: "",
};

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function csv(value: string) {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

export function toPayload(form: StartupFormState): StartupPayload {
  return {
    idea: form.idea.trim(),
    problem: optional(form.problem),
    target_customer: optional(form.targetCustomer),
    geography: optional(form.geography),
    business_model: optional(form.businessModel),
    current_alternatives: csv(form.currentAlternatives),
    customer_pain: optional(form.customerPain),
    proposed_solution: optional(form.proposedSolution),
    gtm_constraints: optional(form.gtmConstraints),
    pricing_hypothesis: optional(form.pricingHypothesis),
    stage: optional(form.stage),
    traction: optional(form.traction),
    team_context: optional(form.teamContext),
    known_competitors: csv(form.knownCompetitors),
  };
}

export function readablePrompt(payload: StartupPayload) {
  const context = [
    payload.target_customer && `Target customer: ${payload.target_customer}`,
    payload.geography && `Market: ${payload.geography}`,
    payload.business_model && `Business model: ${payload.business_model}`,
  ].filter(Boolean);
  return `Research and evaluate this startup idea: ${payload.idea}${
    context.length ? `\n${context.join("\n")}` : ""
  }`;
}

export const STARTUP_BRIEF_MAX_LENGTH = 20_000;
const LONG_BRIEF_MIN_CHARS = 280;
const MULTILINE_BRIEF_MIN_CHARS = 160;
const MULTILINE_BRIEF_MIN_LINES = 5;

export function shouldExtractPastedBrief(
  text: string,
  currentIdea: string,
  selectionStart: number,
  selectionEnd: number,
) {
  const cleaned = text.trim();
  const nonEmptyLines = cleaned.split(/\r?\n/).filter((line) => line.trim()).length;
  const looksLikeBrief =
    cleaned.length >= LONG_BRIEF_MIN_CHARS ||
    (cleaned.length >= MULTILINE_BRIEF_MIN_CHARS &&
      nonEmptyLines >= MULTILINE_BRIEF_MIN_LINES);
  const replacesIdea =
    !currentIdea.trim() ||
    (selectionStart === 0 && selectionEnd === currentIdea.length);
  return looksLikeBrief && replacesIdea;
}

export function fromPayload(payload: StartupPayload): StartupFormState {
  return {
    idea: payload.idea ?? "",
    problem: payload.problem ?? "",
    targetCustomer: payload.target_customer ?? "",
    geography: payload.geography ?? "",
    businessModel: payload.business_model ?? "",
    currentAlternatives: payload.current_alternatives?.join(", ") ?? "",
    customerPain: payload.customer_pain ?? "",
    proposedSolution: payload.proposed_solution ?? "",
    gtmConstraints: payload.gtm_constraints ?? "",
    pricingHypothesis: payload.pricing_hypothesis ?? "",
    stage: payload.stage ?? "",
    traction: payload.traction ?? "",
    teamContext: payload.team_context ?? "",
    knownCompetitors: payload.known_competitors?.join(", ") ?? "",
  };
}

export function mergeExtractedForm(
  current: StartupFormState,
  payload: StartupPayload,
): StartupFormState {
  const extracted = fromPayload(payload);
  const next = { ...current };
  for (const key of Object.keys(initialFormState) as (keyof StartupFormState)[]) {
    const value = extracted[key].trim();
    if (!value) continue;
    if (key === "idea" || !current[key].trim()) next[key] = value;
  }
  return next;
}
