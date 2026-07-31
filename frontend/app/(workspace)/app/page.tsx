"use client";

import { Plus, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { StartupCanvas } from "@/components/canvas/startup-canvas";
import { Composer } from "@/components/composer";
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
import { useComposerDraft } from "@/hooks/use-composer-draft";
import { useElapsed } from "@/hooks/use-elapsed";
import { useStartupStream } from "@/hooks/use-startup-stream";
import { formatElapsed } from "@/lib/run-phase";
import type { ResearchRunStatus } from "@/lib/scout-api";
import { readablePrompt, toPayload } from "@/lib/startup-form";
import type { StartupPayload } from "@/lib/types";

/**
 * The stream reports AI-SDK transport statuses; the chip speaks persisted run
 * statuses. Mapping here keeps one status vocabulary across the app.
 */
const STREAM_STATUS: Record<string, ResearchRunStatus> = {
  submitted: "queued",
  streaming: "running",
  running: "running",
  done: "completed",
  cancelled: "cancelled",
  error: "failed",
};

export default function ResearchPage() {
  const router = useRouter();
  const { refresh } = useProjects();
  const { form, update, clearDraft, draftRestored, dismissRestoredNotice } =
    useComposerDraft();
  const [hasStarted, setHasStarted] = useState(false);
  const [submittedPayload, setSubmittedPayload] = useState<StartupPayload>();
  const [pendingAction, setPendingAction] = useState<"leave" | "stop" | null>(null);
  const {
    agents,
    searches,
    sources,
    report,
    markdown,
    isRunning,
    displayStatus,
    error,
    submit,
    cancelRun,
  } = useStartupStream();
  const elapsedMs = useElapsed(isRunning);

  /*
   * The canvas is gated on the structured report, not on the streaming
   * Markdown: the Markdown arrives first but is no longer rendered, so
   * switching views on it would show an empty workspace.
   */
  const structuredReport =
    report?.status === "completed" ? report.report : undefined;

  const outcome: RunOutcomeState = error
    ? "error"
    : isRunning
      ? "running"
      : displayStatus === "cancelled"
        ? "cancelled"
        : displayStatus === "done"
          ? "done"
          : "running";

  async function startRun(payload: StartupPayload) {
    setSubmittedPayload(payload);
    setHasStarted(true);
    await submit(readablePrompt(payload), { startup: payload });
    // The run created a project (or a new version of one), and the sidebar owns
    // that list — so it has to hear about it.
    void refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = toPayload(form);
    if (!payload.idea || isRunning) return;
    await startRun(payload);
  }

  async function retryRun() {
    const payload = submittedPayload ?? toPayload(form);
    if (!payload.idea || isRunning) return;
    await startRun(payload);
  }

  function confirmPendingAction() {
    if (pendingAction === "stop") cancelRun();
    if (pendingAction === "leave") router.push("/projects");
    setPendingAction(null);
  }

  return (
    <>
      <ViewHeader
        title={hasStarted && form.idea ? form.idea : "New research"}
        meta={
          hasStarted ? (
            <span className="flex shrink-0 items-center gap-2">
              <StatusChip
                status={STREAM_STATUS[displayStatus]}
                label={displayStatus}
                pulse={isRunning}
              />
              {isRunning && (
                <span className="hidden text-[12px] tabular-nums text-muted-foreground sm:inline">
                  {formatElapsed(elapsedMs)}
                </span>
              )}
            </span>
          ) : undefined
        }
        actions={
          hasStarted ? (
            isRunning ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPendingAction("stop")}
                className="gap-1.5"
              >
                <Square size={11} fill="currentColor" />
                <span className="hidden sm:inline">Stop</span>
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => setHasStarted(false)}
                className="gap-1.5"
              >
                <Plus size={13} />
                <span className="hidden sm:inline">New run</span>
              </Button>
            )
          ) : undefined
        }
      />

      {!hasStarted ? (
        <Composer
          form={form}
          onUpdate={update}
          onSubmit={handleSubmit}
          isRunning={isRunning}
          error={error}
          draftRestored={draftRestored}
          onClearDraft={clearDraft}
          onDismissRestored={dismissRestoredNotice}
        />
      ) : !structuredReport ? (
        <RunView
          agents={agents}
          searches={searches}
          isRunning={isRunning}
          outcome={outcome}
          error={error}
          onRetry={retryRun}
          onEditIdea={() => setHasStarted(false)}
        />
      ) : (
        <main className="view-enter mx-auto w-full max-w-[84rem] space-y-6 px-4 py-6 pb-safe sm:px-6">
          <StartupCanvas
            report={structuredReport}
            payload={submittedPayload}
            markdown={markdown}
            sources={sources}
          />
          <ResearchActivity agents={agents} searches={searches} />
        </main>
      )}

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === "stop"
                ? "Stop this research run?"
                : "Leave this research run?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === "stop"
                ? "Scout will cancel this run. Events collected so far remain in its project history, but no final report will be created."
                : "This project is saved. Leaving while research is active may cancel the current run."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep researching</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPendingAction}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {pendingAction === "stop" ? "Stop run" : "Leave anyway"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
