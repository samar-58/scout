import type { StartupPayload } from "@/lib/types";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:3000"
).replace(/\/$/, "");

export interface CreatedProject {
  id: string;
  name: string;
  idea: string;
}

export async function createProject(
  token: string,
  startup: StartupPayload,
  fetcher: typeof fetch = fetch,
): Promise<CreatedProject> {
  if (!startup.idea.trim()) throw new Error("A startup idea is required.");

  const response = await fetcher(`${API_BASE_URL}/api/projects`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: startup.idea.trim().slice(0, 200),
      idea: startup.idea.trim(),
      startup_context: startup,
    }),
  });

  if (!response.ok) {
    const problem = (await response.json().catch(() => undefined)) as
      | { detail?: string }
      | undefined;
    throw new Error(problem?.detail ?? "Could not create the project.");
  }

  return (await response.json()) as CreatedProject;
}


export interface ScoutProject extends CreatedProject {
  startup_context: StartupPayload;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

/**
 * What `GET /api/projects` returns: the project plus the aggregates the
 * sidebar and the projects list need. Additive over `ScoutProject`, so a
 * single request replaces the per-project runs/reports fan-out the list used
 * to perform.
 */
export interface ProjectSummary extends ScoutProject {
  run_count: number;
  version_count: number;
  latest_version: number | null;
  latest_run_id: string | null;
  latest_run_status: ResearchRunStatus | null;
  latest_run_checkpoint_stage: string | null;
  overall_score: number | null;
  last_activity_at: string;
}

export type ResearchRunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface ResearchRunRecord {
  id: string;
  project_id: string;
  status: ResearchRunStatus;
  request_payload: StartupPayload;
  report_payload: import("@/lib/report-types").StructuredReport | null;
  markdown_report: string | null;
  error_message: string | null;
  checkpoint_stage: string | null;
  resume_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportArtifactRecord {
  id: string;
  project_id: string;
  run_id: string;
  version: number;
  schema_version: string;
  payload: import("@/lib/report-types").StructuredReport;
  markdown_report: string;
  model_metadata: Record<string, unknown>;
  created_at: string;
}

async function authenticatedJson<T>(
  path: string,
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<T> {
  const response = await fetcher(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => undefined)) as
      | { detail?: string }
      | undefined;
    throw new Error(problem?.detail ?? "Could not load Scout data.");
  }
  return (await response.json()) as T;
}

export function listProjects(token: string, fetcher: typeof fetch = fetch) {
  return authenticatedJson<ProjectSummary[]>("/api/projects", token, fetcher);
}

export function getProject(
  token: string,
  projectId: string,
  fetcher: typeof fetch = fetch,
) {
  return authenticatedJson<ScoutProject>(
    `/api/projects/${projectId}`,
    token,
    fetcher,
  );
}

export function listProjectRuns(
  token: string,
  projectId: string,
  fetcher: typeof fetch = fetch,
) {
  return authenticatedJson<ResearchRunRecord[]>(
    `/api/projects/${projectId}/runs`,
    token,
    fetcher,
  );
}

export interface StreamEventRecord {
  sequence: number;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

async function authenticatedMutation<T>(
  path: string,
  token: string,
  body: Record<string, unknown> | undefined,
  fetcher: typeof fetch = fetch,
): Promise<T> {
  const response = await fetcher(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => undefined)) as
      | { detail?: string }
      | undefined;
    throw new Error(problem?.detail ?? "Scout could not update this run.");
  }
  return (await response.json()) as T;
}

export function dispatchRun(
  token: string,
  projectId: string,
  startup: StartupPayload,
  message: string,
  fetcher: typeof fetch = fetch,
) {
  return authenticatedMutation<ResearchRunRecord>(
    "/api/runs",
    token,
    {
      project_id: projectId,
      messages: [
        {
          id: `user-${Date.now()}`,
          role: "user",
          parts: [{ type: "text", text: message }],
        },
      ],
      startup,
    },
    fetcher,
  );
}

export function getRun(
  token: string,
  runId: string,
  fetcher: typeof fetch = fetch,
) {
  return authenticatedJson<ResearchRunRecord>(
    `/api/runs/${runId}`,
    token,
    fetcher,
  );
}

export function listRunEvents(
  token: string,
  runId: string,
  after: number,
  fetcher: typeof fetch = fetch,
) {
  return authenticatedJson<StreamEventRecord[]>(
    `/api/runs/${runId}/events?after=${after}`,
    token,
    fetcher,
  );
}

export function cancelRun(
  token: string,
  runId: string,
  fetcher: typeof fetch = fetch,
) {
  return authenticatedMutation<ResearchRunRecord>(
    `/api/runs/${runId}/cancel`,
    token,
    undefined,
    fetcher,
  );
}

export function listProjectReports(
  token: string,
  projectId: string,
  fetcher: typeof fetch = fetch,
) {
  return authenticatedJson<ReportArtifactRecord[]>(
    `/api/projects/${projectId}/reports`,
    token,
    fetcher,
  );
}

export function resumeRun(
  token: string,
  runId: string,
  fetcher: typeof fetch = fetch,
) {
  return authenticatedMutation<ResearchRunRecord>(
    `/api/runs/${runId}/resume`,
    token,
    undefined,
    fetcher,
  );
}

export function extractStartupBrief(
  token: string,
  text: string,
  fetcher: typeof fetch = fetch,
) {
  return authenticatedMutation<import("@/lib/types").StartupPayload>(
    "/api/startup/extract",
    token,
    { text },
    fetcher,
  );
}

// --- Evidence-to-decision loop ------------------------------------------------

export type AssumptionStatusValue =
  | "untested"
  | "testing"
  | "supported"
  | "contradicted"
  | "inconclusive";

export type AssumptionReviewState = "proposed" | "accepted" | "edited" | "rejected";

export interface AssumptionRecord {
  id: string;
  project_id: string;
  run_id: string | null;
  statement: string;
  category: string;
  kind: string;
  why_it_matters: string | null;
  suggested_response: string | null;
  risk_rank: number;
  confidence: number | null;
  status: AssumptionStatusValue;
  review_state: AssumptionReviewState;
  founder_note: string | null;
  created_at: string;
  updated_at: string;
}

export type ExperimentStatus =
  | "suggested"
  | "planned"
  | "running"
  | "completed"
  | "abandoned";

export type ExperimentResult = "supported" | "contradicted" | "inconclusive";

export type ObservationKind = "metric" | "quote" | "note" | "surprise" | "constraint";

export interface ObservationRecord {
  id: string;
  experiment_id: string;
  kind: ObservationKind;
  text: string;
  numeric_value: number | null;
  participant_count: number | null;
  source_url: string | null;
  created_at: string;
}

export interface ExperimentRecord {
  id: string;
  project_id: string;
  run_id: string | null;
  name: string;
  goal: string | null;
  method: string | null;
  channel: string | null;
  target_participant: string | null;
  script: string | null;
  success_metric: string | null;
  success_threshold: string | null;
  failure_threshold: string | null;
  estimated_time: string | null;
  estimated_cost: string | null;
  status: ExperimentStatus;
  sprint_position: number;
  result: ExperimentResult | null;
  result_summary: string | null;
  review_payload: Record<string, unknown> | null;
  assumptions: {
    id: string;
    statement: string;
    category: string;
    status: AssumptionStatusValue;
  }[];
  observations: ObservationRecord[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DecisionRecord {
  id: string;
  project_id: string;
  experiment_id: string | null;
  assumption_id: string | null;
  kind: string;
  proposal: string;
  rationale: string | null;
  supporting_evidence: string[];
  contradicting_evidence: string[];
  confidence: number | null;
  reversal_conditions: string | null;
  thesis_changes: Record<string, string>;
  status: "proposed" | "confirmed" | "rejected";
  confirmed_at: string | null;
  created_at: string;
  evidence_quality?: string | null;
  recommended_next_action?: string | null;
}

export interface ThesisVersionRecord {
  id: string;
  project_id: string;
  decision_id: string | null;
  run_id: string | null;
  version: number;
  fields: Record<string, { value: string; origin: string }>;
  summary: string | null;
  change_note: string | null;
  created_at: string;
}

export interface ClaimRecord {
  id: string;
  run_id: string | null;
  stance: "supporting" | "contradicting" | "unknown" | "competitor" | "pain";
  text: string;
  origin: string;
  created_at: string;
}

export interface EvidenceRecord {
  id: string;
  claim_id: string | null;
  run_id: string | null;
  source_url: string | null;
  source_title: string | null;
  snippet: string | null;
  workflow: string | null;
  created_at: string;
}

export interface TimelineEntryRecord {
  kind: string;
  id: string;
  at: string;
  title: string;
  detail: string | null;
  status: string | null;
}

export interface ExperimentReviewResponse {
  experiment: ExperimentRecord;
  decision: DecisionRecord;
  evidence_quality: string;
  recommended_next_action: string;
}

async function authenticatedPatch<T>(
  path: string,
  token: string,
  body: Record<string, unknown>,
  fetcher: typeof fetch = fetch,
): Promise<T> {
  const response = await fetcher(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => undefined)) as
      | { detail?: string }
      | undefined;
    throw new Error(problem?.detail ?? "Scout could not save that change.");
  }
  return (await response.json()) as T;
}

export function listAssumptions(
  token: string,
  projectId: string,
  fetcher: typeof fetch = fetch,
) {
  return authenticatedJson<AssumptionRecord[]>(
    `/api/projects/${projectId}/assumptions`,
    token,
    fetcher,
  );
}

export function reviewAssumption(
  token: string,
  assumptionId: string,
  review: {
    statement?: string;
    review_state?: AssumptionReviewState;
    status?: AssumptionStatusValue;
    risk_rank?: number;
    confidence?: number;
    founder_note?: string;
  },
  fetcher: typeof fetch = fetch,
) {
  return authenticatedPatch<AssumptionRecord>(
    `/api/assumptions/${assumptionId}`,
    token,
    review,
    fetcher,
  );
}

export function listExperiments(
  token: string,
  projectId: string,
  fetcher: typeof fetch = fetch,
) {
  return authenticatedJson<ExperimentRecord[]>(
    `/api/projects/${projectId}/experiments`,
    token,
    fetcher,
  );
}

export function buildValidationSprint(
  token: string,
  projectId: string,
  assumptionIds: string[] | undefined,
  fetcher: typeof fetch = fetch,
) {
  return authenticatedMutation<ExperimentRecord[]>(
    `/api/projects/${projectId}/sprint`,
    token,
    assumptionIds?.length ? { assumption_ids: assumptionIds } : {},
    fetcher,
  );
}

export function updateExperiment(
  token: string,
  experimentId: string,
  update: { status?: ExperimentStatus } & Record<string, unknown>,
  fetcher: typeof fetch = fetch,
) {
  return authenticatedPatch<ExperimentRecord>(
    `/api/experiments/${experimentId}`,
    token,
    update,
    fetcher,
  );
}

export function addObservation(
  token: string,
  experimentId: string,
  observation: {
    kind: ObservationKind;
    text: string;
    numeric_value?: number | null;
    participant_count?: number | null;
    source_url?: string | null;
  },
  fetcher: typeof fetch = fetch,
) {
  return authenticatedMutation<ObservationRecord>(
    `/api/experiments/${experimentId}/observations`,
    token,
    observation,
    fetcher,
  );
}

export function reviewExperiment(
  token: string,
  experimentId: string,
  fetcher: typeof fetch = fetch,
) {
  return authenticatedMutation<ExperimentReviewResponse>(
    `/api/experiments/${experimentId}/review`,
    token,
    undefined,
    fetcher,
  );
}

export function listDecisions(
  token: string,
  projectId: string,
  fetcher: typeof fetch = fetch,
) {
  return authenticatedJson<DecisionRecord[]>(
    `/api/projects/${projectId}/decisions`,
    token,
    fetcher,
  );
}

export function confirmDecision(
  token: string,
  decisionId: string,
  body: { thesis_changes?: Record<string, string>; change_note?: string } = {},
  fetcher: typeof fetch = fetch,
) {
  return authenticatedMutation<DecisionRecord>(
    `/api/decisions/${decisionId}/confirm`,
    token,
    body,
    fetcher,
  );
}

export function rejectDecision(
  token: string,
  decisionId: string,
  note: string | undefined,
  fetcher: typeof fetch = fetch,
) {
  return authenticatedMutation<DecisionRecord>(
    `/api/decisions/${decisionId}/reject`,
    token,
    note ? { note } : {},
    fetcher,
  );
}

export function listThesisVersions(
  token: string,
  projectId: string,
  fetcher: typeof fetch = fetch,
) {
  return authenticatedJson<ThesisVersionRecord[]>(
    `/api/projects/${projectId}/thesis`,
    token,
    fetcher,
  );
}

export function listProjectTimeline(
  token: string,
  projectId: string,
  fetcher: typeof fetch = fetch,
) {
  return authenticatedJson<TimelineEntryRecord[]>(
    `/api/projects/${projectId}/timeline`,
    token,
    fetcher,
  );
}

export function listProjectClaims(
  token: string,
  projectId: string,
  fetcher: typeof fetch = fetch,
) {
  return authenticatedJson<ClaimRecord[]>(
    `/api/projects/${projectId}/claims`,
    token,
    fetcher,
  );
}

export function listProjectEvidence(
  token: string,
  projectId: string,
  fetcher: typeof fetch = fetch,
) {
  return authenticatedJson<EvidenceRecord[]>(
    `/api/projects/${projectId}/evidence`,
    token,
    fetcher,
  );
}
