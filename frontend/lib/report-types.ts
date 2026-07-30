/**
 * Structured report payload carried by the `data-report` SSE part.
 *
 * These mirror the backend Pydantic models in `startup_graph.py`
 * (`StartupStressTestV2Response`). The stream adapter strips
 * `markdown_report` from the data part, so the Markdown arrives separately as
 * `text-delta` chunks and is not modelled here.
 *
 * Every field is optional on read: a run can fail mid-flight, and specialist
 * fallbacks emit empty insights. The canvas derives from whatever is present.
 */

export interface ReportDimensionScore {
  score: number;
  rationale?: string;
  evidence?: string;
}

export interface ReportScores {
  overall: number;
  market?: ReportDimensionScore;
  competition?: ReportDimensionScore;
  distribution?: ReportDimensionScore;
  execution?: ReportDimensionScore;
  timing?: ReportDimensionScore;
  monetization?: ReportDimensionScore;
}

export interface ReportMarketAnalysis {
  tam?: string;
  sam?: string;
  som?: string;
  cagr?: string;
  trends?: string[];
  why_now?: string;
  why_not_already_won?: string;
}

export interface ReportCompetitor {
  name?: string;
  icp?: string;
  pricing?: string;
  weakness?: string;
  opportunity?: string;
}

export interface ReportCustomerPain {
  pain_points?: string[];
  switching_triggers?: string[];
  current_workarounds?: string[];
  why_users_switch?: string;
}

export interface ReportGTMStrategy {
  first_customer?: string;
  acquisition_channels?: string[];
  pricing?: string;
  first_100_customers?: string;
}

export interface ReportObjection {
  question?: string;
  why_it_matters?: string;
  best_answer?: string;
}

export interface ReportMoatAnalysis {
  data_moat?: string;
  workflow_lock_in?: string;
  switching_cost?: string;
  distribution_moat?: string;
  network_effects?: string;
  realistic_moat?: string;
}

export interface ReportRisk {
  name?: string;
  reason?: string;
  evidence?: string;
  mitigation?: string;
}

export interface ReportExperiment {
  name?: string;
  goal?: string;
  method?: string;
  success_criteria?: string;
  failure_criteria?: string;
  time?: string;
  cost?: string;
}

export interface ReportSource {
  url: string;
  title?: string;
}

export interface StructuredReport {
  verdict?: string;
  investment_recommendation?: string;
  confidence?: number;
  score_explanation?: string;
  scores?: ReportScores;
  market_analysis?: ReportMarketAnalysis;
  competitor_snapshot?: ReportCompetitor[];
  customer_pain?: ReportCustomerPain;
  gtm_strategy?: ReportGTMStrategy;
  yc_objections?: ReportObjection[];
  moat_analysis?: ReportMoatAnalysis;
  risks?: ReportRisk[];
  opportunities?: string[];
  experiments?: ReportExperiment[];
  agent_notes?: Record<string, string>;
  sources?: ReportSource[];
}
