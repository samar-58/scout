import { describe, expect, test } from "bun:test";
import {
  API_BASE_URL,
  createProject,
  dispatchRun,
  listProjectReports,
  listProjectRuns,
  listProjects,
  listRunEvents,
  resumeRun,
} from "@/lib/scout-api";

const startup = {
  idea: "  AI workflow for accounting firms  ",
  target_customer: "Small CPA firms",
};

describe("createProject", () => {
  test("creates an owned project with the Clerk bearer token", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(
        JSON.stringify({ id: "project-1", name: "Test", idea: "Test" }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const project = await createProject("session-token", startup, fetcher);

    expect(capturedUrl).toBe(`${API_BASE_URL}/api/projects`);
    expect(capturedInit?.method).toBe("POST");
    expect((capturedInit?.headers as Record<string, string>).Authorization).toBe(
      "Bearer session-token",
    );
    expect(JSON.parse(String(capturedInit?.body))).toEqual({
      name: "AI workflow for accounting firms",
      idea: "AI workflow for accounting firms",
      startup_context: startup,
    });
    expect(project.id).toBe("project-1");
  });

  test("surfaces the backend error detail", async () => {
    const fetcher = (async () =>
      new Response(JSON.stringify({ detail: "Authentication required." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })) as unknown as typeof fetch;

    expect(createProject("bad-token", startup, fetcher)).rejects.toThrow(
      "Authentication required.",
    );
  });
});


describe("saved project APIs", () => {
  test("loads projects, runs, and immutable reports with bearer auth", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const responses = [
      [{ id: "project-1", name: "Project", idea: "Idea", startup_context: {} }],
      [{ id: "run-1", status: "failed", checkpoint_stage: "synthesizer" }],
      [{ id: "report-1", version: 1, payload: { verdict: "Proceed" } }],
    ];
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return new Response(JSON.stringify(responses.shift()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const [projects, runs, reports] = await Promise.all([
      listProjects("token", fetcher),
      listProjectRuns("token", "project-1", fetcher),
      listProjectReports("token", "project-1", fetcher),
    ]);

    expect(projects[0].id).toBe("project-1");
    expect(runs[0].checkpoint_stage).toBe("synthesizer");
    expect(reports[0].payload.verdict).toBe("Proceed");
    expect(calls.map((call) => call.url)).toEqual([
      `${API_BASE_URL}/api/projects`,
      `${API_BASE_URL}/api/projects/project-1/runs`,
      `${API_BASE_URL}/api/projects/project-1/reports`,
    ]);
    expect(
      calls.every(
        (call) =>
          (call.init?.headers as Record<string, string>).Authorization ===
          "Bearer token",
      ),
    ).toBe(true);
  });

  test("dispatches a durable run and polls only events after the cursor", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      const body = calls.length === 1
        ? { id: "run-1", status: "queued", project_id: "project-1" }
        : [{ sequence: 8, event_type: "agent_status", payload: {} }];
      return new Response(JSON.stringify(body), {
        status: calls.length === 1 ? 202 : 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const run = await dispatchRun(
      "token",
      "project-1",
      startup,
      "Research this idea",
      fetcher,
    );
    const events = await listRunEvents("token", run.id, 7, fetcher);

    expect(run.id).toBe("run-1");
    expect(events[0].sequence).toBe(8);
    expect(calls[0].url).toBe(`${API_BASE_URL}/api/runs`);
    expect(calls[0].init?.method).toBe("POST");
    const requestBody = JSON.parse(String(calls[0].init?.body));
    expect(requestBody.project_id).toBe("project-1");
    expect(requestBody.startup).toEqual(startup);
    expect(requestBody.messages[0].parts[0].text).toBe("Research this idea");
    expect(calls[1].url).toBe(
      `${API_BASE_URL}/api/runs/run-1/events?after=7`,
    );
  });

  test("dispatches resume without waiting for research completion", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(JSON.stringify({ id: "run-1", status: "queued" }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const run = await resumeRun("token", "run-1", fetcher);

    expect(run.status).toBe("queued");
    expect(capturedUrl).toBe(`${API_BASE_URL}/api/runs/run-1/resume`);
    expect(capturedInit?.method).toBe("POST");
    expect((capturedInit?.headers as Record<string, string>).Authorization).toBe(
      "Bearer token",
    );
  });
});
