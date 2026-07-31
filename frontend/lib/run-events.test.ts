import { describe, expect, test } from "bun:test";
import { lastSequence, reduceRunEvents } from "@/lib/run-events";
import type { StreamEventRecord } from "@/lib/scout-api";

let sequence = 0;
function event(
  event_type: string,
  payload: Record<string, unknown>,
): StreamEventRecord {
  sequence += 1;
  return {
    sequence,
    event_type,
    payload: { type: event_type, ...payload },
    created_at: "2026-07-31T09:00:00Z",
  };
}

describe("reduceRunEvents", () => {
  test("keeps the latest status per specialist", () => {
    const activity = reduceRunEvents([
      event("agent_status", {
        agent: "market_analyst",
        display_name: "Market Analyst",
        status: "running",
        message: "Working",
      }),
      event("agent_status", {
        agent: "market_analyst",
        display_name: "Market Analyst",
        status: "completed",
        message: "Done",
        findings: ["Fragmented market"],
        elapsed_ms: 4200,
      }),
    ]);

    const market = activity.agents.find((agent) => agent.agent === "market_analyst");
    expect(market?.status).toBe("completed");
    expect(market?.findings).toEqual(["Fragmented market"]);
  });

  test("merges search_start and search_end for the same index", () => {
    const activity = reduceRunEvents([
      event("search_start", {
        index: 1,
        status: "running",
        query: "cpa firm software spend",
        purpose: "Market size",
      }),
      event("search_end", {
        index: 1,
        status: "completed",
        result_count: 4,
        top_results: [{ url: "https://example.com/a", title: "A" }],
      }),
    ]);

    expect(activity.searches).toHaveLength(1);
    const [search] = activity.searches;
    // The end event carries no query; merging is what keeps it on screen.
    expect(search.query).toBe("cpa firm software spend");
    expect(search.purpose).toBe("Market size");
    expect(search.status).toBe("completed");
    expect(search.result_count).toBe(4);
  });

  test("orders searches by index regardless of arrival order", () => {
    const activity = reduceRunEvents([
      event("search_start", { index: 3, query: "c" }),
      event("search_start", { index: 1, query: "a" }),
      event("search_start", { index: 2, query: "b" }),
    ]);
    expect(activity.searches.map((search) => search.index)).toEqual([1, 2, 3]);
  });

  test("shows the full roster for a live run and only reporters for a saved one", () => {
    const events = [
      event("agent_status", {
        agent: "market_analyst",
        display_name: "Market Analyst",
        status: "completed",
        message: "Done",
      }),
    ];

    expect(reduceRunEvents(events).agents).toHaveLength(7);
    expect(
      reduceRunEvents(events, { includeQueuedAgents: false }).agents,
    ).toHaveLength(1);
  });

  test("deduplicates sources by URL and concatenates report deltas", () => {
    const activity = reduceRunEvents([
      event("source", { source: { url: "https://example.com/a", title: "A" } }),
      event("source", { source: { url: "https://example.com/a", title: "A again" } }),
      event("source", { source: { url: "https://example.com/b" } }),
      event("report_delta", { delta: "# Report" }),
      event("report_delta", { delta: "\nBody" }),
    ]);

    expect(activity.sources.map((source) => source.url)).toEqual([
      "https://example.com/a",
      "https://example.com/b",
    ]);
    expect(activity.markdown).toBe("# Report\nBody");
  });

  test("surfaces the structured report from run_end", () => {
    const activity = reduceRunEvents([
      event("run_end", { report: { verdict: "Narrow", scores: { overall: 58 } } }),
    ]);
    expect(activity.report?.status).toBe("completed");
    expect(activity.report?.report?.scores?.overall).toBe(58);
  });

  test("ignores unknown event types and malformed payloads", () => {
    const activity = reduceRunEvents([
      event("something_new", { whatever: true }),
      event("agent_status", { status: "running" }),
      event("search_start", { query: "no index" }),
      event("source", {}),
    ]);
    expect(activity.searches).toHaveLength(0);
    expect(activity.sources).toHaveLength(0);
    // No agent id means no agent row, only the queued baseline.
    expect(activity.agents.every((agent) => agent.status === "queued")).toBe(true);
  });

  test("stamps `since` when a state begins and holds it while unchanged", () => {
    sequence = 0;
    const first = event("agent_status", {
      agent: "market_analyst",
      display_name: "Market Analyst",
      status: "running",
      message: "Reading evidence",
    });
    first.created_at = "2026-07-31T09:00:00.000Z";
    const repeat = event("agent_status", {
      agent: "market_analyst",
      display_name: "Market Analyst",
      status: "running",
      message: "Still reading",
    });
    repeat.created_at = "2026-07-31T09:00:20.000Z";
    const done = event("agent_status", {
      agent: "market_analyst",
      display_name: "Market Analyst",
      status: "completed",
      message: "Done",
    });
    done.created_at = "2026-07-31T09:00:31.000Z";

    // A repeated running event must not restart the counter.
    const midway = reduceRunEvents([first, repeat], { includeQueuedAgents: false });
    expect(midway.agents[0].since).toBe("2026-07-31T09:00:00.000Z");

    // A state change does restart it.
    const settled = reduceRunEvents([first, repeat, done], {
      includeQueuedAgents: false,
    });
    expect(settled.agents[0].since).toBe("2026-07-31T09:00:31.000Z");
  });

  test("stamps `since` on searches so an in-flight query can count up", () => {
    sequence = 0;
    const start = event("search_start", {
      index: 1,
      status: "running",
      query: "cpa firm software spend",
    });
    start.created_at = "2026-07-31T09:00:05.000Z";
    const end = event("search_end", { index: 1, status: "completed", result_count: 4 });
    end.created_at = "2026-07-31T09:00:09.000Z";

    expect(reduceRunEvents([start]).searches[0].since).toBe(
      "2026-07-31T09:00:05.000Z",
    );
    expect(reduceRunEvents([start, end]).searches[0].since).toBe(
      "2026-07-31T09:00:09.000Z",
    );
  });

  test("reduces an empty log to an empty activity", () => {
    const activity = reduceRunEvents([], { includeQueuedAgents: false });
    expect(activity).toEqual({
      agents: [],
      searches: [],
      sources: [],
      score: undefined,
      report: undefined,
      markdown: "",
    });
  });
});

describe("lastSequence", () => {
  test("reads the tail sequence for ?after= polling", () => {
    sequence = 40;
    const records = [event("a", {}), event("b", {})];
    expect(lastSequence(records)).toBe(42);
    expect(lastSequence([])).toBe(0);
  });
});
