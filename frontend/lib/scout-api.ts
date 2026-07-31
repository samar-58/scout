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
