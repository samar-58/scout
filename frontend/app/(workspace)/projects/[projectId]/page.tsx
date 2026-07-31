"use client";

import { useAuth } from "@clerk/nextjs";
import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StartupCanvas } from "@/components/canvas/startup-canvas";
import { LocalTime } from "@/components/local-time";
import { RunTimeline } from "@/components/projects/run-timeline";
import { useProjects } from "@/components/shell/projects-store";
import { ViewHeader } from "@/components/shell/view-header";
import { StatusChip } from "@/components/status-chip";
import { Button } from "@/components/ui/button";
import { plural } from "@/lib/format";
import {
  getProject,
  listProjectReports,
  listProjectRuns,
  resumeRun,
  type ReportArtifactRecord,
  type ResearchRunRecord,
  type ScoutProject,
} from "@/lib/scout-api";
import { cn } from "@/lib/utils";

type Tab = "canvas" | "runs";

/**
 * A saved project.
 *
 * Two things live here: the report canvas and the run history. They used to be
 * stacked, with a hero, a section heading and a card per run between them —
 * which meant the canvas, the actual product, started three screens down. Tabs
 * put both one click apart and let the canvas open immediately.
 */
export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { getToken } = useAuth();
  const { refresh: refreshSidebar } = useProjects();
  const [project, setProject] = useState<ScoutProject>();
  const [runs, setRuns] = useState<ResearchRunRecord[]>([]);
  const [reports, setReports] = useState<ReportArtifactRecord[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>();
  const [resumingRunId, setResumingRunId] = useState<string>();
  const [tab, setTab] = useState<Tab>("canvas");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session has expired. Please sign in again.");
      const [savedProject, savedRuns, savedReports] = await Promise.all([
        getProject(token, projectId),
        listProjectRuns(token, projectId),
        listProjectReports(token, projectId),
      ]);
      setProject(savedProject);
      setRuns(savedRuns);
      setReports(savedReports);
      setSelectedReportId((current) =>
        current && savedReports.some((report) => report.id === current)
          ? current
          : savedReports[0]?.id,
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load project.",
      );
    } finally {
      setLoading(false);
    }
  }, [getToken, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) ?? reports[0],
    [reports, selectedReportId],
  );

  async function handleResume(runId: string) {
    setResumingRunId(runId);
    setError(undefined);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session has expired. Please sign in again.");
      await resumeRun(token, runId);
      await load();
      void refreshSidebar();
    } catch (resumeError) {
      setError(
        resumeError instanceof Error
          ? resumeError.message
          : "Could not resume the research run.",
      );
    } finally {
      setResumingRunId(undefined);
    }
  }

  const latestRun = runs[0];

  return (
    <>
      <ViewHeader
        title={project?.name ?? "Loading…"}
        meta={
          latestRun ? <StatusChip status={latestRun.status} /> : undefined
        }
        actions={
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => void load()}
              disabled={loading}
              aria-label="Refresh project"
            >
              <RefreshCw className={cn("size-4", loading && "spin")} />
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
        <div className="flex items-center gap-1 px-3 sm:px-5">
          <TabButton active={tab === "canvas"} onClick={() => setTab("canvas")}>
            Canvas
            {reports.length > 0 && (
              <span className="ml-1.5 text-subtle-foreground tabular-nums">
                {reports.length}
              </span>
            )}
          </TabButton>
          <TabButton active={tab === "runs"} onClick={() => setTab("runs")}>
            Runs
            {runs.length > 0 && (
              <span className="ml-1.5 text-subtle-foreground tabular-nums">
                {runs.length}
              </span>
            )}
          </TabButton>
        </div>
      </ViewHeader>

      <main className="view-enter px-4 py-6 pb-safe sm:px-6">
        {error && (
          <p className="mb-5 border-l-2 border-destructive pl-3 text-[13px] text-destructive">
            {error}
          </p>
        )}

        {loading && !project ? (
          <div className="mx-auto max-w-[84rem] space-y-3">
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-64 animate-pulse rounded-xl bg-muted" />
          </div>
        ) : !project ? (
          <p className="py-20 text-center text-[13px] text-muted-foreground">
            This project could not be found.
          </p>
        ) : tab === "canvas" ? (
          <div className="mx-auto max-w-[84rem]">
            {/* One quiet line of context, then straight into the canvas. */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 pb-5">
              <p className="max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
                {project.idea}
              </p>
              {selectedReport && (
                <div className="flex shrink-0 items-center gap-3 text-[12px] text-muted-foreground">
                  {reports.length > 1 && (
                    <label className="flex items-center gap-1.5">
                      <span className="sr-only">Report version</span>
                      <select
                        value={selectedReport.id}
                        onChange={(event) => setSelectedReportId(event.target.value)}
                        className="h-7 rounded-md border border-border bg-card px-1.5 text-[12px] focus:border-border-strong focus:outline-none"
                      >
                        {reports.map((report) => (
                          <option key={report.id} value={report.id}>
                            Version {report.version}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <span>
                    v{selectedReport.version} saved{" "}
                    <LocalTime value={selectedReport.created_at} />
                  </span>
                </div>
              )}
            </div>

            {selectedReport ? (
              <StartupCanvas
                report={selectedReport.payload}
                payload={project.startup_context}
                markdown={selectedReport.markdown_report}
                sources={(selectedReport.payload.sources ?? []).map((source) => ({
                  url: source.url,
                  title: source.title,
                }))}
              />
            ) : (
              <div className="py-16 text-center">
                <h2 className="font-serif text-xl font-semibold">
                  No report version yet
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                  {runs.length === 0
                    ? "This project has no research runs."
                    : "The latest run stopped before synthesis. Resume it from the Runs tab."}
                </p>
                {runs.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-5"
                    onClick={() => setTab("runs")}
                  >
                    Open run history
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-[52rem]">
            <p className="pb-4 text-[13px] leading-relaxed text-muted-foreground">
              {plural(runs.length, "run")} · completed stages are checkpointed, so
              a failed or cancelled run resumes without repeating saved searches
              or specialist work.
            </p>
            <RunTimeline
              runs={runs}
              onResume={(runId) => void handleResume(runId)}
              resumingRunId={resumingRunId}
            />
          </div>
        )}
      </main>
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-selected={active}
      role="tab"
      className={cn(
        "relative -mb-px h-9 px-2.5 text-[13px] transition-colors",
        active
          ? "font-medium text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {active && (
        <span className="absolute inset-x-2 -bottom-px h-[1.5px] bg-foreground" />
      )}
    </button>
  );
}
