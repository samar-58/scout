import { describe, expect, test } from "bun:test";
import { deriveLoopProgress } from "@/lib/loop-progress";
import type {
  AssumptionRecord,
  DecisionRecord,
  ExperimentRecord,
  ThesisVersionRecord,
} from "@/lib/scout-api";

function assumption(
  overrides: Partial<AssumptionRecord> = {},
): AssumptionRecord {
  return {
    id: "a1",
    project_id: "p1",
    run_id: null,
    statement: "Buyers will pay monthly",
    category: "pricing",
    kind: "risk",
    why_it_matters: null,
    suggested_response: null,
    risk_rank: 1,
    confidence: 70,
    status: "untested",
    review_state: "accepted",
    founder_note: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function decision(overrides: Partial<DecisionRecord> = {}): DecisionRecord {
  return {
    id: "d1",
    project_id: "p1",
    experiment_id: null,
    assumption_id: null,
    kind: "thesis_change",
    proposal: "Change pricing",
    rationale: null,
    supporting_evidence: [],
    contradicting_evidence: [],
    confidence: 70,
    reversal_conditions: null,
    thesis_changes: {},
    status: "confirmed",
    confirmed_at: "2026-01-02T00:00:00Z",
    created_at: "2026-01-02T00:00:00Z",
    recommended_next_action: "Test per-filing pricing with the same firms.",
    evidence_quality: "moderate",
    ...overrides,
  };
}

describe("deriveLoopProgress", () => {
  test("uses the latest confirmed decision's next action as the sprint hint", () => {
    const progress = deriveLoopProgress({
      assumptions: [assumption()],
      experiments: [] as ExperimentRecord[],
      decisions: [decision()],
      thesisVersions: [
        {
          id: "t1",
          project_id: "p1",
          decision_id: "d1",
          run_id: null,
          version: 2,
          fields: {},
          summary: null,
          change_note: null,
          created_at: "2026-01-02T00:00:00Z",
        } satisfies ThesisVersionRecord,
      ],
    });

    expect(progress.nextAction.kind).toBe("build-sprint");
    expect(progress.nextAction.hint).toBe(
      "Test per-filing pricing with the same firms.",
    );
  });

  test("uses guided next action for next-cycle when assumptions are settled", () => {
    const progress = deriveLoopProgress({
      assumptions: [
        assumption({
          status: "supported",
          review_state: "accepted",
        }),
      ],
      experiments: [] as ExperimentRecord[],
      decisions: [decision()],
      thesisVersions: [],
    });

    expect(progress.nextAction.kind).toBe("next-cycle");
    expect(progress.nextAction.hint).toBe(
      "Test per-filing pricing with the same firms.",
    );
  });
});
