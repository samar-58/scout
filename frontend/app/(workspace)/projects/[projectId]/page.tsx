"use client";

import { useAuth } from "@clerk/nextjs";
import { Plus, RefreshCw, Square } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StartupCanvas } from "@/components/canvas/startup-canvas";
import { LocalTime } from "@/components/local-time";
import { RunTimeline } from "@/components/projects/run-timeline";
import { ResearchActivity } from "@/components/research-activity";
import { RunView, type RunOutcomeState } from "@/components/run-view";
import { useProjects } from "@/components/shell/projects-store";
import { ViewHeader } from "@/components/shell/view-header";
import { StatusChip } from "@/components/status-chip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useRunFeed } from "@/hooks/use-run-feed";
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
 * A project: its live run, its canvas, and its history.
 *
 * This is where a run lives. While the latest run is active the page *is* the
 * run view — the same component the composer used to render inline — and it
 * swaps to the canvas the moment synthesis lands. That means a reload, a shared
 * link, and a second tab all show the same thing, which was not true when the
 * live view only existed inside `/app`'s component state.
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
  const [confirmStop, setConfirmStop] = useState(false);
  const [startedAt, setStartedAt] = useState<number>();

  const load = useCallback(async () => {
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

  const latestRun = runs[0];
  const latestIsActive =
    latestRun?.status === "running" || latestRun?.status === "queued";

  // Follow the newest run whenever it is unfinished; otherwise poll nothing.
  const feed = useRunFeed(latestIsActive ? latestRun?.id : undefined);

  useEffect(() => {
    if (latestIsActive) setStartedAt((current) => current ?? Date.now());
    else setStartedAt(undefined);
  }, [latestIsActive]);

  /*
   * When the followed run reaches a terminal state, the report version it
   * produced exists — reload so the canvas replaces the live view, and let the
   * sidebar pick up the new score.
   */
  useEffect(() => {
    if (!feed.settledRunId) return;
    void load();
    void refreshSidebar();
  }, [feed.settledRunId, load, refreshSidebar]);

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

  const liveOutcome: RunOutcomeState = feed.error
    ? "error"
    : feed.status === "cancelled"
      ? "cancelled"
      : feed.status === "completed"
        ? "done"
        : "running";

  // The live run owns the page while it is unfinished and no version exists yet.
  const showLiveRun = latestIsActive || (feed.isActive && reports.length === 0);

  return (
    <>
      <ViewHeader
        title={project?.name ?? "Loading…"}
        meta={
          latestRun ? (
            <StatusChip status={feed.status ?? latestRun.status} />
          ) : undefined
        }
        actions={
          <>
            {showLiveRun ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmStop(true)}
                className="gap-1.5"
              >
                <Square size={11} fill="currentColor" />
                <span className="hidden sm:inline">Stop</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => void load()}
                disabled={loading}
                aria-label="Refresh project"
              >
                <RefreshCw className={cn("size-4", loading && "spin")} />
              </Button>
            )}
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/app">
                <Plus size={13} />
                <span className="hidden sm:inline">New research</span>
              </Link>
            </Button>
          </>
        }
      >
        {!showLiveRun && (
          <div className="flex items-center gap-1 px-3 sm:px-5">
            <TabButton active={tab === "canvas"} onClick={() => setTab("canvas")}>
              Canvas
              {reports.length > 0 && (
                <span className="ml-1.5 tabular-nums text-subtle-foreground">
                  {reports.length}
                </span>
              )}
            </TabButton>
            <TabButton active={tab === "runs"} onClick={() => setTab("runs")}>
              Runs
              {runs.length > 0 && (
                <span className="ml-1.5 tabular-nums text-subtle-foreground">
                  {runs.length}
                </span>
              )}
            </TabButton>
          </div>
        )}
      </ViewHeader>

      {showLiveRun ? (
        <RunView
          activity={feed.activity}
          isRunning={liveOutcome === "running"}
          outcome={liveOutcome}
          startedAt={startedAt}
          error={feed.error}
          warning={feed.warning}
          onRetry={
            liveOutcome === "error" || liveOutcome === "cancelled"
              ? () => setTab("runs")
              : undefined
          }
          retryLabel="Open run history"
        />
      ) : (
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
                <div className="space-y-8">
                  <StartupCanvas
                    report={selectedReport.payload}
                    payload={project.startup_context}
                    markdown={selectedReport.markdown_report}
                    sources={(selectedReport.payload.sources ?? []).map((source) => ({
                      url: source.url,
                      title: source.title,
                    }))}
                  />
                  {/*
                    The run that produced this version, replayed from its events —
                    the same specialists and searches watched while it ran.
                  */}
                  <ResearchActivity runId={selectedReport.run_id} />
                </div>
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
      )}

      <AlertDialog
        open={confirmStop}
        onOpenChange={(open) => {
          if (!open) setConfirmStop(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop this research run?</AlertDialogTitle>
            <AlertDialogDescription>
              Scout will cancel this run. Events collected so far remain in the
              project history and completed stages can be resumed, but no report
              version will be created.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep researching</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void feed.cancel().then(() => {
                  void load();
                  void refreshSidebar();
                });
                setConfirmStop(false);
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Stop run
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
