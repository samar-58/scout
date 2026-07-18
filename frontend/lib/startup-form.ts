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
  return `Stress-test this startup idea: ${payload.idea}${
    context.length ? `\n${context.join("\n")}` : ""
  }`;
}
