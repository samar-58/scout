import { describe, expect, test } from "bun:test";
import { API_BASE_URL, createProject } from "@/lib/scout-api";

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
