"use client";

import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { LocalTime } from "@/components/local-time";
import { useProjects } from "@/components/shell/projects-store";
import { ViewHeader } from "@/components/shell/view-header";
import { Button } from "@/components/ui/button";
import { filterProjects } from "@/lib/project-groups";
import type { ProjectSummary } from "@/lib/scout-api";
import { statusMeta, TONE_DOT } from "@/lib/status-meta";
import { cn } from "@/lib/utils";

type Filter = "all" | "scored" | "active" | "attention";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "scored", label: "Scored" },
  { value: "active", label: "Running" },
  { value: "attention", label: "Unfinished" },
];

function matches(project: ProjectSummary, filter: Filter) {
  const status = project.latest_run_status;
  if (filter === "scored") return project.version_count > 0;
  if (filter === "active") return status === "running" || status === "queued";
  if (filter === "attention") return status === "failed" || status === "cancelled";
  return true;
}

/**
 * All projects, as a table.
 *
 * This was a grid of cards, each carrying a coloured verdict strip, a score
 * ring, six tinted dimension bars and a status pill — nine visual elements per
 * project, none of them comparable across rows. A table is comparable: the same
 * fields land in the same columns, so scores line up and scanning is free.
 */
export default function ProjectsPage() {
  const { projects, loading, error, refresh } = useProjects();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const visible = useMemo(
    () => filterProjects(projects, query).filter((project) => matches(project, filter)),
    [projects, query, filter],
  );

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  return (
    <>
      <ViewHeader
        title="All projects"
        meta={
          projects.length > 0 ? (
            <span className="text-[12px] tabular-nums text-muted-foreground">
              {projects.length}
            </span>
          ) : undefined
        }
        actions={
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => void handleRefresh()}
              disabled={loading || refreshing}
              aria-label="Refresh projects"
            >
              <RefreshCw className={cn("size-4", (loading || refreshing) && "spin")} />
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/app">
                <Plus size={13} />
                <span className="hidden sm:inline">New research</span>
              </Link>
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3 px-3 pb-2.5 sm:px-5">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by name or idea"
            aria-label="Filter projects"
            className="h-8 w-full max-w-56 rounded-md border border-border bg-card px-2.5 text-[13px] placeholder:text-subtle-foreground focus:border-border-strong focus:outline-none"
          />
          <div role="tablist" aria-label="Status filter" className="flex items-center gap-1">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={filter === option.value}
                onClick={() => setFilter(option.value)}
                className={cn(
                  "h-8 rounded-md px-2.5 text-[13px] transition-colors",
                  filter === option.value
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </ViewHeader>

      <main className="view-enter px-4 py-6 pb-safe sm:px-6">
        {error && (
          <div className="mx-auto max-w-[64rem] border-l-2 border-destructive pl-3 text-[13px] text-destructive">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="mt-1 font-medium underline underline-offset-4"
            >
              Try again
            </button>
          </div>
        )}

        <div className="mx-auto max-w-[64rem]">
          {loading ? (
            <ul className="divide-y divide-border border-y border-border">
              {[0, 1, 2, 3].map((row) => (
                <li key={row} className="flex h-14 items-center gap-4">
                  <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="h-3.5 w-16 animate-pulse rounded bg-muted" />
                </li>
              ))}
            </ul>
          ) : projects.length === 0 ? (
            <div className="py-20 text-center">
              <h2 className="font-serif text-xl font-semibold">No projects yet</h2>
              <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                Your first stress test creates a saved project, with its events,
                checkpoints, and report versions.
              </p>
              <Button asChild size="sm" className="mt-5 gap-1.5">
                <Link href="/app">
                  <Plus size={13} /> Stress-test an idea
                </Link>
              </Button>
            </div>
          ) : visible.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-muted-foreground">
              Nothing matches {query ? `“${query}”` : "this filter"}.
            </p>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="label py-2 font-normal">
                    Project
                  </th>
                  <th
                    scope="col"
                    className="label hidden w-24 py-2 text-right font-normal sm:table-cell"
                  >
                    Score
                  </th>
                  <th
                    scope="col"
                    className="label hidden w-28 py-2 pl-4 font-normal md:table-cell"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="label hidden w-24 py-2 pl-4 text-right font-normal lg:table-cell"
                  >
                    Runs
                  </th>
                  <th
                    scope="col"
                    className="label w-32 py-2 pl-4 text-right font-normal"
                  >
                    Activity
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((project) => (
                  <ProjectRow key={project.id} project={project} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}

function ProjectRow({ project }: { project: ProjectSummary }) {
  const meta = statusMeta(project.latest_run_status);
  const score = project.overall_score;

  return (
    <tr className="row-hover group border-b border-border">
      <td className="py-0">
        <Link
          href={`/projects/${project.id}`}
          className="block py-3 pr-4 outline-none focus-visible:underline"
        >
          <span className="block truncate text-[13.5px] font-medium">
            {project.name}
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">
            {project.idea}
          </span>
        </Link>
      </td>

      {/* Score: the number, with a hairline bar for shape. Monochrome on purpose. */}
      <td className="hidden py-3 align-middle sm:table-cell">
        {score != null ? (
          <div className="flex items-center justify-end gap-2">
            <span className="h-1 w-10 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-foreground/70"
                style={{ width: `${Math.max(2, Math.min(100, score))}%` }}
              />
            </span>
            <span className="w-6 text-right text-[13px] tabular-nums">
              {Math.round(score)}
            </span>
          </div>
        ) : (
          <span className="block text-right text-[13px] text-subtle-foreground">—</span>
        )}
      </td>

      <td className="hidden py-3 pl-4 align-middle md:table-cell">
        <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
          <span className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[meta.tone])} />
          {meta.label}
        </span>
      </td>

      <td className="hidden py-3 pl-4 text-right align-middle text-[12.5px] tabular-nums text-muted-foreground lg:table-cell">
        {project.run_count}
        {project.version_count > 0 && (
          <span className="text-subtle-foreground"> · v{project.latest_version}</span>
        )}
      </td>

      <td className="py-3 pl-4 text-right align-middle text-[12.5px] text-muted-foreground">
        <LocalTime mode="relative" value={project.last_activity_at} />
      </td>
    </tr>
  );
}
