import { describe, expect, test } from "bun:test";
import {
  formatDuration,
  formatRelative,
  initials,
  plural,
} from "@/lib/format";

describe("formatRelative", () => {
  test("collapses sub-minute gaps to 'just now'", () => {
    expect(formatRelative(new Date(Date.now() - 5_000).toISOString())).toBe(
      "just now",
    );
  });

  test("coarsens the unit as the gap grows", () => {
    const hoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const daysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelative(hoursAgo)).toMatch(/hour/);
    expect(formatRelative(daysAgo)).toMatch(/day/);
  });

  test("falls back rather than rendering Invalid Date", () => {
    expect(formatRelative(undefined)).toBe("—");
    expect(formatRelative(null)).toBe("—");
    expect(formatRelative("not-a-date")).toBe("—");
  });
});

describe("formatDuration", () => {
  test("renders seconds, minutes, and hours", () => {
    const start = "2026-01-01T00:00:00.000Z";
    expect(formatDuration(start, "2026-01-01T00:00:42.000Z")).toBe("42s");
    expect(formatDuration(start, "2026-01-01T00:02:05.000Z")).toBe("2m 5s");
    expect(formatDuration(start, "2026-01-01T01:30:00.000Z")).toBe("1h 30m");
  });

  test("refuses to invent a duration from a missing or reversed range", () => {
    expect(formatDuration("2026-01-01T00:00:00.000Z", null)).toBe("—");
    expect(
      formatDuration("2026-01-01T01:00:00.000Z", "2026-01-01T00:00:00.000Z"),
    ).toBe("—");
  });
});

describe("plural", () => {
  test("only pluralises past one", () => {
    expect(plural(1, "run")).toBe("1 run");
    expect(plural(0, "run")).toBe("0 runs");
    expect(plural(4, "version")).toBe("4 versions");
  });
});

describe("initials", () => {
  test("derives at most two letters and never returns empty", () => {
    expect(initials("Accounting Copilot")).toBe("AC");
    expect(initials("Scout")).toBe("SC");
    expect(initials("   ")).toBe("S");
    expect(initials("AI-native QA marketplace")).toBe("AN");
  });
});
