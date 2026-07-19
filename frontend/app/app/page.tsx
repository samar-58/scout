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
import { IdeaComposer } from "@/components/idea-composer";
import { LivePulse } from "@/components/live-pulse";
import { LiveResearch } from "@/components/live-research";
import { ReportPanel } from "@/components/report-panel";
import { ResearchActivity } from "@/components/research-activity";
import { ScoutMark } from "@/components/scout-logo";
import { Button } from "@/components/ui/button";
import { useStartupStream } from "@/hooks/use-startup-stream";
import { initialFormState, readablePrompt, toPayload } from "@/lib/startup-form";
import { cn } from "@/lib/utils";
import type { StartupFormState } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  streaming: "border-border bg-muted text-foreground",
  submitted: "border-border bg-muted text-foreground",
  running: "border-border bg-muted text-foreground",
  done: "border-success/30 bg-success/10 text-success",
  cancelled: "border-warning/30 bg-warning/10 text-warning",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
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
  const [form, setForm] = useState<StartupFormState>(initialFormState);
  const [hasStarted, setHasStarted] = useState(false);
  const {
    agents,
    searches,
    sources,
    score,
    markdown,
    isRunning,
    displayStatus,
    error,
    submit,
    cancelRun,
  } = useStartupStream();

  function update<K extends keyof StartupFormState>(
    field: K,
    value: StartupFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = toPayload(form);
    if (!payload.idea || isRunning) return;
    setHasStarted(true);
    await submit(readablePrompt(payload), { startup: payload });
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
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1580px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              onClick={(event) => {
                if (hasStarted) {
                  event.preventDefault();
                  requestLeave();
                }
              }}
              className="flex shrink-0 items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={15} />
              <span className="flex items-center gap-1.5">
                <ScoutMark size={15} className="text-foreground" />
                <span className="font-serif text-sm font-semibold text-foreground">
                  Scout
                </span>
              </span>
            </Link>
            {hasStarted && form.idea && (
              <>
                <span className="text-border">/</span>
                <p className="min-w-0 truncate text-sm text-muted-foreground">
                  {form.idea}
                </p>
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {hasStarted && (
              <StatusPill displayStatus={displayStatus} isRunning={isRunning} />
            )}
            {hasStarted && isRunning && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={requestStop}
                className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <Square size={12} fill="currentColor" /> Stop
              </Button>
            )}
            {hasStarted && !isRunning && (
              <Button type="button" size="sm" onClick={newRun} className="gap-1.5">
                <Plus size={14} /> New
              </Button>
            )}
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
        />
      ) : !markdown ? (
        <LiveResearch
          agents={agents}
          searches={searches}
          isRunning={isRunning}
        />
      ) : (
        <main className="mx-auto grid w-full max-w-[1580px] items-start gap-5 p-4 duration-500 animate-in fade-in sm:p-6 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
          <ResearchActivity
            agents={agents}
            searches={searches}
            isRunning={isRunning}
          />
          <ReportPanel
            markdown={markdown}
            score={score}
            sources={sources}
            isRunning={isRunning}
          />
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
