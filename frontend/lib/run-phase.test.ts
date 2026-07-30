import { describe, expect, test } from "bun:test";
import { deriveRunPhase, formatElapsed } from "@/lib/run-phase";
import type { AgentEvent, AgentStatus, SearchEvent } from "@/lib/types";

function agent(status: AgentStatus, id = `agent-${status}`): AgentEvent {
  return {
    type: "agent_status",
    agent: id,
    display_name: id,
    status,
    message: "",
  };
}

function search(status: SearchEvent["status"], index: number): SearchEvent {
  return { type: "search_end", index, status };
}

function queuedSeven() {
  return Array.from({ length: 7 }, (_, index) => agent("queued", `a${index}`));
}

describe("deriveRunPhase", () => {
  test("starts by planning queries before any search exists", () => {
    const phase = deriveRunPhase({
      agents: queuedSeven(),
      searches: [],
      isRunning: true,
      hasReport: false,
    });
    expect(phase.id).toBe("queueing");
    expect(phase.stepIndex).toBe(0);
  });

  test("reports searching while any search is in flight", () => {
    const phase = deriveRunPhase({
      agents: queuedSeven(),
      searches: [search("completed", 1), search("running", 2)],
      isRunning: true,
      hasReport: false,
    });
    expect(phase.id).toBe("searching");
    expect(phase.detail).toContain("1 of 2");
    expect(phase.stepIndex).toBe(0);
  });

  test("reports routing once searches finish but no specialist has started", () => {
    const phase = deriveRunPhase({
      agents: queuedSeven(),
      searches: [search("completed", 1), search("failed", 2)],
      isRunning: true,
      hasReport: false,
    });
    expect(phase.id).toBe("routing");
    expect(phase.stepIndex).toBe(1);
  });

  test("reports analysing while a specialist is running", () => {
    const agents = [...queuedSeven().slice(0, 5), agent("completed"), agent("running")];
    const phase = deriveRunPhase({
      agents,
      searches: [search("completed", 1)],
      isRunning: true,
      hasReport: false,
    });
    expect(phase.id).toBe("analysing");
    expect(phase.detail).toContain("1 of 7");
    expect(phase.stepIndex).toBe(1);
  });

  test("moves to writing once every specialist has settled", () => {
    const agents = [
      ...Array.from({ length: 6 }, (_, i) => agent("completed", `c${i}`)),
      agent("failed"),
    ];
    const phase = deriveRunPhase({
      agents,
      searches: [search("completed", 1)],
      isRunning: true,
      hasReport: false,
    });
    expect(phase.id).toBe("writing");
    expect(phase.stepIndex).toBe(2);
  });

  test("a delivered report is complete regardless of event bookkeeping", () => {
    const phase = deriveRunPhase({
      agents: queuedSeven(),
      searches: [],
      isRunning: false,
      hasReport: true,
    });
    expect(phase.id).toBe("complete");
    expect(phase.stepIndex).toBe(3);
  });

  test("a stopped run mid-search does not claim completion", () => {
    const phase = deriveRunPhase({
      agents: queuedSeven(),
      searches: [search("running", 1)],
      isRunning: false,
      hasReport: false,
    });
    expect(phase.id).not.toBe("complete");
  });
});

describe("formatElapsed", () => {
  test("formats as m:ss and clamps negatives", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(9_000)).toBe("0:09");
    expect(formatElapsed(65_000)).toBe("1:05");
    expect(formatElapsed(600_000)).toBe("10:00");
    expect(formatElapsed(-500)).toBe("0:00");
  });
});
