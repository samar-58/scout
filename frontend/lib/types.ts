export type AgentStatus = "queued" | "running" | "completed" | "failed";

export interface AgentEvent {
  type: "agent_status";
  agent: string;
  display_name: string;
  status: AgentStatus;
  message: string;
  elapsed_ms?: number;
  findings?: string[];
}

export interface SearchResult {
  title?: string;
  url?: string;
  snippet?: string;
}

export interface SearchEvent {
  type: "search_start" | "search_end" | "evidence_ready";
  id?: string;
  index?: number;
  total?: number;
  status?: "running" | "completed" | "failed";
  query?: string;
  purpose?: string;
  result_count?: number;
  top_results?: SearchResult[];
  elapsed_ms?: number;
  error?: string;
  search_count?: number;
  failed_search_count?: number;
}

export interface ScoreDimension {
  score: number;
  rationale?: string;
  evidence?: string;
}

export interface ScoreEvent {
  type: "score";
  scores: {
    overall: number;
    market: ScoreDimension;
    competition: ScoreDimension;
    distribution: ScoreDimension;
    execution: ScoreDimension;
    timing: ScoreDimension;
    monetization: ScoreDimension;
  };
  score_explanation: string;
}

export interface ReportEvent {
  status: "completed" | "failed";
  elapsed_ms?: number;
  report?: Record<string, unknown>;
}

export interface Source {
  url: string;
  title?: string;
}

export interface StartupFormState {
  idea: string;
  problem: string;
  targetCustomer: string;
  geography: string;
  businessModel: string;
  currentAlternatives: string;
  customerPain: string;
  proposedSolution: string;
  gtmConstraints: string;
  pricingHypothesis: string;
  stage: string;
  traction: string;
  teamContext: string;
  knownCompetitors: string;
}

export interface StartupPayload {
  idea: string;
  problem?: string;
  target_customer?: string;
  geography?: string;
  business_model?: string;
  current_alternatives?: string[];
  customer_pain?: string;
  proposed_solution?: string;
  gtm_constraints?: string;
  pricing_hypothesis?: string;
  stage?: string;
  traction?: string;
  team_context?: string;
  known_competitors?: string[];
}
