import { describe, expect, test } from "bun:test";
import { buildCanvasModel, deriveDecision } from "@/lib/report-canvas";
import type { StructuredReport } from "@/lib/report-types";
import type { StartupPayload } from "@/lib/types";

const report: StructuredReport = {
  verdict: "Promising but distribution-constrained.",
  investment_recommendation: "Narrow to firms already using cloud ledgers.",
  confidence: 62,
  scores: {
    overall: 58,
    market: { score: 7, rationale: "Large fragmented base." },
    competition: { score: 4, rationale: "Incumbents bundling AI." },
    distribution: { score: 3, rationale: "Outbound to CPAs is slow." },
    execution: { score: 6 },
    timing: { score: 8 },
    monetization: { score: 5 },
  },
  market_analysis: {
    tam: "$12B",
    sam: "$1.4B",
    som: "$40M",
    cagr: "11%",
    trends: ["Cloud ledger adoption", "Staffing shortages"],
    why_now: "Ledger APIs opened up.",
    why_not_already_won: "Trust barriers in financial workflows.",
  },
  competitor_snapshot: [
    {
      name: "Botkeeper",
      icp: "Mid-size firms",
      pricing: "$500/mo",
      weakness: "Slow onboarding",
      opportunity: "Self-serve wedge",
    },
  ],
  customer_pain: {
    pain_points: ["Month-end close is manual"],
    switching_triggers: ["Losing a senior accountant"],
    current_workarounds: ["Spreadsheets"],
    why_users_switch: "Close takes too long every month.",
  },
  gtm_strategy: {
    first_customer: "A 12-person CPA firm in the Midwest",
    acquisition_channels: ["Founder outbound", "State CPA associations"],
    pricing: "$79 per seat",
    first_100_customers: "Association partnerships.",
  },
  yc_objections: [
    {
      question: "Will accountants trust AI with client books?",
      why_it_matters: "Trust gates adoption.",
      best_answer: "Human-in-the-loop review.",
    },
  ],
  moat_analysis: {
    data_moat: "Firm-specific close patterns",
    workflow_lock_in: "Embedded in monthly close",
    switching_cost: "Moderate",
    distribution_moat: "Weak",
    network_effects: "None",
    realistic_moat: "Workflow lock-in only.",
  },
  risks: [
    {
      name: "Trust barrier in financial workflows",
      reason: "Accountants are liable for errors.",
      evidence: "Forum threads on AI bookkeeping errors.",
      mitigation: "Ship an audit trail.",
    },
    {
      name: "Slow outbound to CPA firms",
      reason: "Long sales cycles and low urgency.",
      evidence: "Reported 3-6 month cycles.",
      mitigation: "Partner with associations.",
    },
  ],
  opportunities: ["Self-serve wedge below incumbent pricing"],
  experiments: [
    {
      name: "Trust interview sprint",
      goal: "Test whether accountants trust AI review",
      method: "10 interviews with firm partners",
      success_criteria: "6+ accept human-in-the-loop",
      failure_criteria: "Fewer than 3 accept",
      time: "1 week",
      cost: "$0",
    },
    {
      name: "Outbound response test",
      goal: "Measure outbound reply rate for CPA firms",
      method: "60 cold emails",
      success_criteria: "10% reply",
      failure_criteria: "<3% reply",
      time: "2 weeks",
      cost: "$50",
    },
  ],
  sources: [{ url: "https://example.com/a", title: "Cloud ledger report" }],
};

const payload: StartupPayload = {
  idea: "AI copilot for small accounting firms",
  problem: "Month-end close work is slow and repetitive.",
  target_customer: "CPA firms with 5-20 employees",
};

describe("deriveDecision", () => {
  test("bands the overall score into a recommendation", () => {
    expect(deriveDecision({ scores: { overall: 82 } }).label).toBe("Proceed");
    expect(deriveDecision({ scores: { overall: 58 } }).label).toBe(
      "Narrow the focus",
    );
    expect(deriveDecision({ scores: { overall: 40 } }).label).toBe(
      "Investigate further",
    );
    expect(deriveDecision({}).label).toBe("Reconsider");
  });

  test("prefers the synthesised recommendation over the canned summary", () => {
    expect(deriveDecision(report).summary).toBe(
      "Narrow to firms already using cloud ledgers.",
    );
  });

  test("leads change conditions with the weakest scored dimensions", () => {
    const conditions = deriveDecision(report).changeConditions;
    expect(conditions[0]).toContain("distribution");
    expect(conditions[1]).toContain("competition");
    expect(conditions.length).toBeLessThanOrEqual(4);
  });
});

describe("buildCanvasModel", () => {
  const model = buildCanvasModel(report, payload);

  test("marks founder-asserted thesis lines separately from inferred ones", () => {
    const problem = model.thesis.find((card) => card.key === "problem");
    expect(problem?.origin).toBe("founder");
    expect(problem?.value).toBe(payload.problem);

    const pricing = model.thesis.find((card) => card.key === "pricing");
    expect(pricing?.origin).toBe("scout");
    expect(pricing?.value).toBe("$79 per seat");
  });

  test("builds assumptions from risks then objections", () => {
    expect(model.assumptions.map((assumption) => assumption.kind)).toEqual([
      "risk",
      "risk",
      "objection",
    ]);
  });

  test("links each assumption to the experiment that would settle it", () => {
    expect(model.assumptions[0].experimentId).toBe("experiment-0");
    expect(model.assumptions[1].experimentId).toBe("experiment-1");
  });

  test("leaves weakly related assumptions unlinked", () => {
    const unrelated = buildCanvasModel({
      risks: [{ name: "Regulatory capture", reason: "Licensing regimes vary." }],
      experiments: report.experiments,
    });
    expect(unrelated.assumptions[0].experimentId).toBeUndefined();
  });

  test("sorts evidence by which way it cuts", () => {
    expect(model.evidence.supporting).toHaveLength(4);
    expect(model.evidence.contradicting).toHaveLength(3);
    expect(model.evidence.unknown).toHaveLength(2);
    expect(model.evidence.contradicting[0].origin).toBe(
      "Trust barrier in financial workflows",
    );
  });

  test("keeps experiment success and failure lines intact", () => {
    expect(model.experiments).toHaveLength(2);
    expect(model.experiments[0].successCriteria).toBe(
      "6+ accept human-in-the-loop",
    );
    expect(model.experiments[1].failureCriteria).toBe("<3% reply");
  });

  test("degrades to an empty canvas when the report is empty", () => {
    const empty = buildCanvasModel({});
    expect(empty.thesis).toHaveLength(0);
    expect(empty.assumptions).toHaveLength(0);
    expect(empty.experiments).toHaveLength(0);
    expect(empty.evidence.supporting).toHaveLength(0);
    expect(empty.decision.label).toBe("Reconsider");
  });

  test("drops experiments and risks with no usable name", () => {
    const partial = buildCanvasModel({
      experiments: [{ method: "no name or goal" }, { name: "  " }],
      risks: [{ reason: "unnamed risk" }],
    });
    expect(partial.experiments).toHaveLength(0);
    expect(partial.assumptions).toHaveLength(0);
  });
});
