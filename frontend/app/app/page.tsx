"use client";

import { ArrowLeft, Plus, Square } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
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
import { StartupCanvas } from "@/components/canvas/startup-canvas";
import { IdeaComposer } from "@/components/idea-composer";
import { LivePulse } from "@/components/live-pulse";
import { LiveResearch } from "@/components/live-research";
import { ResearchActivity } from "@/components/research-activity";
import type { RunOutcomeState } from "@/components/run-header";
import { ScoutMark } from "@/components/scout-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useComposerDraft } from "@/hooks/use-composer-draft";
import { useElapsed } from "@/hooks/use-elapsed";
import { useStartupStream } from "@/hooks/use-startup-stream";
import { formatElapsed } from "@/lib/run-phase";
import { readablePrompt, toPayload } from "@/lib/startup-form";
import { cn } from "@/lib/utils";
import type { StartupPayload } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  streaming: "border-border bg-muted text-foreground",
  submitted: "border-border bg-muted text-foreground",
  running: "border-border bg-muted text-foreground",
  done: "border-success/30 bg-success-muted text-success",
  cancelled: "border-warning/30 bg-warning-muted text-warning",
  error: "border-destructive/30 bg-destructive-muted text-destructive",
};

function StatusPill({
  displayStatus,
  isRunning,
}: {
  displayStatus: string;
  isRunning: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.1em] uppercase",
        STATUS_STYLES[displayStatus] ?? "border-border bg-muted text-muted-foreground",
      )}
    >
      {isRunning && <LivePulse size={10} />}
      {displayStatus}
    </span>
  );
}

export default function AppPage() {
  const router = useRouter();
  const { form, update, clearDraft, draftRestored, dismissRestoredNotice } =
    useComposerDraft();
  const [hasStarted, setHasStarted] = useState(false);
  const [submittedPayload, setSubmittedPayload] = useState<StartupPayload>();
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
   * Markdown. The Markdown arrives first but is no longer rendered, so
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

  function editIdea() {
    setHasStarted(false);
  }

  const [pendingAction, setPendingAction] = useState<"leave" | "stop" | null>(
    null,
  );

  function newRun() {
    setHasStarted(false);
  }

  function requestLeave() {
    if (!hasStarted) return;
    setPendingAction("leave");
  }

  function requestStop() {
    setPendingAction("stop");
  }

  function confirmPendingAction() {
    if (pendingAction === "stop") cancelRun();
    if (pendingAction === "leave") router.push("/");
    setPendingAction(null);
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 pt-safe pr-safe pl-safe backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1580px] items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <Link
              href="/"
              onClick={(event) => {
                if (hasStarted) {
                  event.preventDefault();
                  requestLeave();
                }
              }}
              aria-label="Back to home"
              className="-ml-1.5 flex shrink-0 items-center gap-1.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground active:bg-muted"
            >
              <ArrowLeft size={18} />
              <span className="hidden items-center gap-1.5 sm:flex">
                <ScoutMark size={15} className="text-foreground" />
                <span className="font-serif text-sm font-semibold text-foreground">
                  Scout
                </span>
              </span>
            </Link>
            {hasStarted && form.idea && (
              <>
                <span className="hidden text-border-strong sm:inline">/</span>
                <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {form.idea}
                </p>
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {hasStarted && isRunning && (
              <span className="hidden font-mono text-[11px] tabular-nums text-muted-foreground sm:inline">
                {formatElapsed(elapsedMs)}
              </span>
            )}
            {hasStarted && (
              <StatusPill displayStatus={displayStatus} isRunning={isRunning} />
            )}
            {hasStarted && isRunning && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={requestStop}
                aria-label="Stop research run"
                className="h-9 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <Square size={12} fill="currentColor" />
                <span className="hidden sm:inline">Stop</span>
              </Button>
            )}
            {hasStarted && !isRunning && (
              <Button
                type="button"
                size="sm"
                onClick={newRun}
                aria-label="Start a new research run"
                className="h-9 gap-1.5"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">New</span>
              </Button>
            )}
            <ThemeToggle className="hidden sm:inline-flex" />
          </div>
        </div>
      </header>

      {!hasStarted ? (
        <IdeaComposer
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
        <LiveResearch
          agents={agents}
          searches={searches}
          isRunning={isRunning}
          outcome={outcome}
          elapsedMs={elapsedMs}
          error={error}
          onRetry={retryRun}
          onEditIdea={editIdea}
        />
      ) : (
        <main className="mx-auto w-full max-w-[1580px] space-y-5 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] duration-500 animate-in fade-in sm:p-6">
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
              Nothing is stored. If you {pendingAction === "stop" ? "stop" : "leave"}{" "}
              now, this progress and report will be lost for good.
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
    </div>
  );
}
