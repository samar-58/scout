/**
 * Grouping saved projects by recency, the way a long-lived workspace list has
 * to be grouped to stay scannable. Pure so it can be tested without a DOM.
 */

import type { ProjectSummary } from "@/lib/scout-api";

export interface ProjectGroup {
  key: string;
  label: string;
  projects: ProjectSummary[];
}

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(time: number) {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Buckets are relative to *today*, not to fixed 24-hour windows, so a run from
 * 11pm yesterday reads as "Yesterday" rather than "Today".
 */
export function groupProjectsByRecency(
  projects: ProjectSummary[],
  now = Date.now(),
): ProjectGroup[] {
  const today = startOfDay(now);
  const groups: ProjectGroup[] = [
    { key: "today", label: "Today", projects: [] },
    { key: "yesterday", label: "Yesterday", projects: [] },
    { key: "week", label: "Previous 7 days", projects: [] },
    { key: "month", label: "Previous 30 days", projects: [] },
    { key: "older", label: "Older", projects: [] },
  ];

  for (const project of projects) {
    const stamp = new Date(project.last_activity_at ?? project.updated_at).getTime();
    const day = Number.isNaN(stamp) ? 0 : startOfDay(stamp);
    const distance = Math.round((today - day) / DAY);

    if (distance <= 0) groups[0].projects.push(project);
    else if (distance === 1) groups[1].projects.push(project);
    else if (distance <= 7) groups[2].projects.push(project);
    else if (distance <= 30) groups[3].projects.push(project);
    else groups[4].projects.push(project);
  }

  return groups.filter((group) => group.projects.length > 0);
}

/** Case-insensitive match over the name and the idea text. */
export function filterProjects(projects: ProjectSummary[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return projects;
  return projects.filter((project) =>
    `${project.name} ${project.idea}`.toLowerCase().includes(needle),
  );
}
