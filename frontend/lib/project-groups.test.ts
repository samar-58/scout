import { describe, expect, test } from "bun:test";
import { filterProjects, groupProjectsByRecency } from "@/lib/project-groups";
import type { ProjectSummary } from "@/lib/scout-api";

function project(id: string, lastActivity: string, name = id): ProjectSummary {
  return {
    id,
    name,
    idea: `${name} idea`,
    startup_context: { idea: `${name} idea` },
    created_at: lastActivity,
    updated_at: lastActivity,
    archived_at: null,
    run_count: 1,
    version_count: 1,
    latest_version: 1,
    latest_run_id: "run",
    latest_run_status: "completed",
    latest_run_checkpoint_stage: null,
    overall_score: 60,
    last_activity_at: lastActivity,
  };
}

// Fixed "now": 2026-07-31T12:00 local time.
const NOW = new Date(2026, 6, 31, 12, 0, 0).getTime();
const at = (day: number, hour = 12) =>
  new Date(2026, 6, day, hour, 0, 0).toISOString();

describe("groupProjectsByRecency", () => {
  test("buckets by calendar day, not by rolling 24-hour windows", () => {
    const groups = groupProjectsByRecency(
      [
        project("a", at(31, 9)),
        // 11pm the previous evening is "Yesterday", even though it is under 24h.
        project("b", at(30, 23)),
        project("c", at(27)),
        project("d", at(10)),
        project("e", at(1)),
      ],
      NOW,
    );

    expect(groups.map((group) => group.label)).toEqual([
      "Today",
      "Yesterday",
      "Previous 7 days",
      "Previous 30 days",
    ]);
    expect(groups[0].projects.map((p) => p.id)).toEqual(["a"]);
    expect(groups[1].projects.map((p) => p.id)).toEqual(["b"]);
    expect(groups[2].projects.map((p) => p.id)).toEqual(["c"]);
    // 10 July and 1 July are both inside 30 days of 31 July.
    expect(groups[3].projects.map((p) => p.id)).toEqual(["d", "e"]);
  });

  test("drops empty buckets so the sidebar shows no bare headings", () => {
    const groups = groupProjectsByRecency([project("a", at(31))], NOW);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("today");
  });

  test("keeps a future timestamp in Today rather than losing it", () => {
    const groups = groupProjectsByRecency(
      [project("a", new Date(2026, 6, 31, 23, 0, 0).toISOString())],
      NOW,
    );
    expect(groups[0].key).toBe("today");
  });

  test("survives an unparseable timestamp", () => {
    const broken = { ...project("a", at(31)), last_activity_at: "nonsense" };
    const groups = groupProjectsByRecency([broken], NOW);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("older");
  });

  test("returns nothing for an empty list", () => {
    expect(groupProjectsByRecency([], NOW)).toEqual([]);
  });
});

describe("filterProjects", () => {
  const projects = [
    project("1", at(31), "Accounting copilot"),
    project("2", at(31), "QA marketplace"),
  ];

  test("matches name and idea case-insensitively", () => {
    expect(filterProjects(projects, "ACCOUNTING").map((p) => p.id)).toEqual(["1"]);
    expect(filterProjects(projects, "marketplace idea").map((p) => p.id)).toEqual([
      "2",
    ]);
  });

  test("returns everything for a blank query", () => {
    expect(filterProjects(projects, "   ")).toHaveLength(2);
  });
});
