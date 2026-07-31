import { describe, expect, test } from "bun:test";
import {
  phaseIndex,
  RUN_PHASES,
  stageLabel,
  statusMeta,
  TONE_CHIP,
  TONE_DOT,
} from "@/lib/status-meta";

describe("statusMeta", () => {
  test("marks only pre-terminal statuses as active", () => {
    expect(statusMeta("queued").active).toBe(true);
    expect(statusMeta("running").active).toBe(true);
    expect(statusMeta("completed").active).toBe(false);
    expect(statusMeta("failed").active).toBe(false);
    expect(statusMeta("cancelled").active).toBe(false);
  });

  test("separates outcome tones so the chip colour carries meaning", () => {
    expect(statusMeta("completed").tone).toBe("success");
    expect(statusMeta("cancelled").tone).toBe("warning");
    expect(statusMeta("failed").tone).toBe("danger");
  });

  test("degrades to a no-runs label for a project without runs", () => {
    expect(statusMeta(undefined).label).toBe("No runs");
    expect(statusMeta(null).active).toBe(false);
  });

  test("every tone has both a chip and a dot style", () => {
    for (const tone of ["neutral", "live", "success", "warning", "danger"] as const) {
      expect(TONE_CHIP[tone]).toBeTruthy();
      expect(TONE_DOT[tone]).toBeTruthy();
    }
  });
});

describe("phaseIndex", () => {
  test("maps real graph node names onto the three phases", () => {
    expect(phaseIndex("evidence")).toBe(0);
    expect(phaseIndex("market_analyst")).toBe(1);
    expect(phaseIndex("experiment_agent")).toBe(1);
    expect(phaseIndex("synthesizer")).toBe(2);
  });

  test("returns -1 for no checkpoint or an unknown stage", () => {
    expect(phaseIndex(null)).toBe(-1);
    expect(phaseIndex(undefined)).toBe(-1);
    expect(phaseIndex("something_else")).toBe(-1);
  });

  test("never indexes past the declared phases", () => {
    for (const stage of ["evidence", "vc_partner", "synthesizer"]) {
      expect(phaseIndex(stage)).toBeLessThan(RUN_PHASES.length);
    }
  });
});

describe("stageLabel", () => {
  test("titles specialist ids and names the bookend stages", () => {
    expect(stageLabel("evidence")).toBe("Evidence");
    expect(stageLabel("synthesizer")).toBe("Synthesis");
    expect(stageLabel("gtm_agent")).toBe("Gtm Agent");
    expect(stageLabel(null)).toBe("Not started");
  });
});
