import { describe, expect, test } from "bun:test";
import {
  fromPayload,
  initialFormState,
  mergeExtractedForm,
  shouldExtractPastedBrief,
} from "@/lib/startup-form";

describe("startup brief autofill", () => {
  test("detects only long replacement pastes", () => {
    const longBrief = "A".repeat(300);
    expect(shouldExtractPastedBrief(longBrief, "", 0, 0)).toBe(true);
    expect(shouldExtractPastedBrief("A short idea", "", 0, 0)).toBe(false);
    expect(
      shouldExtractPastedBrief(longBrief, "Existing idea", 4, 4),
    ).toBe(false);
    expect(
      shouldExtractPastedBrief(longBrief, "Existing idea", 0, 13),
    ).toBe(true);
  });

  test("recognizes a structured multiline brief below the long threshold", () => {
    const brief = [
      "Problem: Month-end close is manual and repetitive.",
      "Customer: Independent accounting firms with 5-20 staff.",
      "Solution: Automate reconciliation and close checklists.",
      "Pricing: $99 per firm per month.",
      "Traction: Three firms agreed to pilot the workflow.",
    ].join("\n");
    expect(brief.length).toBeLessThan(280);
    expect(shouldExtractPastedBrief(brief, "", 0, 0)).toBe(true);
  });

  test("maps API fields and preserves context the founder already entered", () => {
    const extracted = {
      idea: "AI close automation for accounting firms",
      target_customer: "Independent accounting firms",
      business_model: "B2B SaaS",
      current_alternatives: ["Spreadsheets", "QuickBooks"],
      known_competitors: ["Digits", "Puzzle"],
    };
    expect(fromPayload(extracted)).toMatchObject({
      targetCustomer: "Independent accounting firms",
      currentAlternatives: "Spreadsheets, QuickBooks",
      knownCompetitors: "Digits, Puzzle",
    });

    const merged = mergeExtractedForm(
      {
        ...initialFormState,
        idea: "The full pasted brief",
        businessModel: "Usage-based pricing",
      },
      extracted,
    );
    expect(merged.idea).toBe("AI close automation for accounting firms");
    expect(merged.targetCustomer).toBe("Independent accounting firms");
    expect(merged.businessModel).toBe("Usage-based pricing");
  });
});
