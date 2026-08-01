import { describe, expect, test } from "bun:test";
import {
  API_BASE_URL,
  addObservation,
  buildValidationSprint,
  confirmDecision,
  listAssumptions,
  rejectDecision,
  reviewAssumption,
  reviewExperiment,
  updateExperiment,
} from "@/lib/scout-api";
import {
  ASSUMPTION_STATUS_META,
  EXPERIMENT_COLUMNS,
  EXPERIMENT_TRANSITIONS,
  THESIS_FIELD_LABELS,
  categoryLabel,
} from "@/lib/loop-meta";

function recorder(body: unknown, status = 200) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
  return { calls, fetcher };
}

describe("validation loop API", () => {
  test("reads assumptions for an owned project with bearer auth", async () => {
    const { calls, fetcher } = recorder([
      { id: "a1", statement: "Firms will pay monthly", risk_rank: 1 },
    ]);

    const assumptions = await listAssumptions("token", "project-1", fetcher);

    expect(assumptions[0].risk_rank).toBe(1);
    expect(calls[0].url).toBe(`${API_BASE_URL}/api/projects/project-1/assumptions`);
    expect((calls[0].init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer token",
    );
  });

  test("reviews an assumption with PATCH and only the changed fields", async () => {
    const { calls, fetcher } = recorder({ id: "a1", review_state: "edited" });

    await reviewAssumption(
      "token",
      "a1",
      { statement: "Firms will not pay monthly" },
      fetcher,
    );

    expect(calls[0].url).toBe(`${API_BASE_URL}/api/assumptions/a1`);
    expect(calls[0].init?.method).toBe("PATCH");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      statement: "Firms will not pay monthly",
    });
  });

  test("omits assumption ids when the sprint should pick the riskiest itself", async () => {
    const { calls, fetcher } = recorder([{ id: "e1", status: "planned" }], 201);

    await buildValidationSprint("token", "project-1", [], fetcher);
    await buildValidationSprint("token", "project-1", ["a1", "a2"], fetcher);

    expect(calls[0].url).toBe(`${API_BASE_URL}/api/projects/project-1/sprint`);
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({});
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({
      assumption_ids: ["a1", "a2"],
    });
  });

  test("moves an experiment and records an observation", async () => {
    const move = recorder({ id: "e1", status: "running" });
    await updateExperiment("token", "e1", { status: "running" }, move.fetcher);
    expect(move.calls[0].url).toBe(`${API_BASE_URL}/api/experiments/e1`);
    expect(move.calls[0].init?.method).toBe("PATCH");

    const observation = recorder({ id: "o1", kind: "metric" }, 201);
    await addObservation(
      "token",
      "e1",
      { kind: "metric", text: "2 of 20 accepted", numeric_value: 2, participant_count: 20 },
      observation.fetcher,
    );
    expect(observation.calls[0].url).toBe(
      `${API_BASE_URL}/api/experiments/e1/observations`,
    );
    expect(JSON.parse(String(observation.calls[0].init?.body))).toEqual({
      kind: "metric",
      text: "2 of 20 accepted",
      numeric_value: 2,
      participant_count: 20,
    });
  });

  test("requests a review and returns the proposed decision", async () => {
    const { calls, fetcher } = recorder(
      {
        experiment: { id: "e1", result: "contradicted" },
        decision: { id: "d1", status: "proposed" },
        evidence_quality: "moderate",
        recommended_next_action: "Test per-filing pricing",
      },
      201,
    );

    const review = await reviewExperiment("token", "e1", fetcher);

    expect(calls[0].url).toBe(`${API_BASE_URL}/api/experiments/e1/review`);
    expect(calls[0].init?.method).toBe("POST");
    expect(review.decision.status).toBe("proposed");
    expect(review.evidence_quality).toBe("moderate");
  });

  test("confirms and rejects decisions through their own endpoints", async () => {
    const confirm = recorder({ id: "d1", status: "confirmed" });
    await confirmDecision("token", "d1", { change_note: "20 calls" }, confirm.fetcher);
    expect(confirm.calls[0].url).toBe(`${API_BASE_URL}/api/decisions/d1/confirm`);
    expect(JSON.parse(String(confirm.calls[0].init?.body))).toEqual({
      change_note: "20 calls",
    });

    const reject = recorder({ id: "d1", status: "rejected" });
    await rejectDecision("token", "d1", "Sample too small", reject.fetcher);
    expect(reject.calls[0].url).toBe(`${API_BASE_URL}/api/decisions/d1/reject`);
    expect(JSON.parse(String(reject.calls[0].init?.body))).toEqual({
      note: "Sample too small",
    });
  });

  test("surfaces the backend detail when a loop mutation is refused", async () => {
    const fetcher = (async () =>
      new Response(
        JSON.stringify({ detail: "Cannot move an experiment from 'completed'." }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      )) as unknown as typeof fetch;

    expect(
      updateExperiment("token", "e1", { status: "running" }, fetcher),
    ).rejects.toThrow("Cannot move an experiment from 'completed'.");
  });
});

describe("loop metadata", () => {
  test("every assumption status has a label and a dot", () => {
    for (const meta of Object.values(ASSUMPTION_STATUS_META)) {
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.dot.startsWith("bg-")).toBe(true);
    }
  });

  test("terminal experiment states offer no forward move", () => {
    expect(EXPERIMENT_TRANSITIONS.completed).toEqual([]);
    expect(EXPERIMENT_TRANSITIONS.running).toContain("completed");
    expect(EXPERIMENT_TRANSITIONS.suggested).toContain("planned");
    // A board column exists for every status the API can return.
    const columns = EXPERIMENT_COLUMNS.map((column) => column.status);
    for (const status of Object.keys(EXPERIMENT_TRANSITIONS)) {
      expect(columns).toContain(status as (typeof columns)[number]);
    }
  });

  test("thesis labels cover exactly the six versioned fields", () => {
    expect(THESIS_FIELD_LABELS.map((field) => field.key)).toEqual([
      "problem",
      "customer",
      "solution",
      "alternatives",
      "pricing",
      "distribution",
    ]);
  });

  test("category labels are humanised", () => {
    expect(categoryLabel("pricing")).toBe("Pricing");
    expect(categoryLabel("")).toBe("");
  });
});
