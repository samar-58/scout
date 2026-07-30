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
