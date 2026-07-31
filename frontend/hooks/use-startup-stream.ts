"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { withQueuedAgents } from "@/lib/agent-meta";
import {
  cancelRun as cancelPersistedRun,
  createProject,
  dispatchRun,
  getRun,
  listRunEvents,
  type StreamEventRecord,
} from "@/lib/scout-api";
import type {
  AgentEvent,
  ReportEvent,
  ScoreEvent,
  SearchEvent,
  StartupPayload,
} from "@/lib/types";

export type RunOutcome = "idle" | "running" | "done" | "cancelled" | "error";

export function useStartupStream() {
  const { getToken } = useAuth();
  const [localError, setLocalError] = useState<string>();
  const [runOutcome, setRunOutcome] = useState<RunOutcome>("idle");
  const [projectId, setProjectId] = useState<string>();
  const [runId, setRunId] = useState<string>();
  const [domainEvents, setDomainEvents] = useState<StreamEventRecord[]>([]);
  const lastSequenceRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = null;
  }, []);

  const pollRun = useCallback(
    async (activeRunId: string, token: string) => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      try {
        const [events, run] = await Promise.all([
          listRunEvents(token, activeRunId, lastSequenceRef.current),
          getRun(token, activeRunId),
        ]);
        const appendEvents = (nextEvents: StreamEventRecord[]) => {
          if (nextEvents.length === 0) return;
          lastSequenceRef.current = nextEvents[nextEvents.length - 1].sequence;
          setDomainEvents((current) => [...current, ...nextEvents]);
        };
        appendEvents(events);

        const terminal = ["completed", "failed", "cancelled"].includes(run.status);
        if (terminal) {
          // The run and its terminal events commit atomically, but the parallel
          // requests above can observe opposite sides of that commit. A second
          // event read after terminal status is visible guarantees the tail is
          // drained before polling stops.
          appendEvents(
            await listRunEvents(token, activeRunId, lastSequenceRef.current),
          );
        }
        if (run.status === "completed") {
          setRunOutcome("done");
          stopPolling();
          return;
        }
        if (run.status === "failed") {
          setLocalError(run.error_message ?? "Research run failed.");
          setRunOutcome("error");
          stopPolling();
          return;
        }
        if (run.status === "cancelled") {
          setRunOutcome("cancelled");
          stopPolling();
          return;
        }
      } catch (pollError) {
        setLocalError(
          pollError instanceof Error ? pollError.message : "Could not refresh the run.",
        );
        setRunOutcome("error");
        stopPolling();
        return;
      } finally {
        pollingRef.current = false;
      }
      pollTimerRef.current = setTimeout(
        () => void pollRun(activeRunId, token),
        750,
      );
    },
    [stopPolling],
  );

  useEffect(() => stopPolling, [stopPolling]);

  const { agents, searches, sources, score, report, markdown } = useMemo(() => {
    const agentMap = new Map<string, AgentEvent>();
    const searchMap = new Map<number, SearchEvent>();
    const sourceMap = new Map<string, { url: string; title?: string }>();
    let scoreEvent: ScoreEvent | undefined;
    let reportEvent: ReportEvent | undefined;
    let text = "";

    for (const record of domainEvents) {
      const payload = record.payload;
      const eventType = String(payload.type ?? record.event_type);
      if (eventType === "agent_status") {
        const event = payload as unknown as AgentEvent;
        agentMap.set(event.agent, event);
      } else if (
        eventType === "search_start" ||
        eventType === "search_end" ||
        eventType === "evidence_ready"
      ) {
        const event = payload as unknown as SearchEvent;
        if (event.index) searchMap.set(event.index, event);
      } else if (eventType === "score") {
        scoreEvent = payload as unknown as ScoreEvent;
      } else if (eventType === "source") {
        const source = (payload as { source?: { url?: string; title?: string } }).source;
        if (source?.url) sourceMap.set(source.url, { url: source.url, title: source.title });
      } else if (eventType === "report_delta") {
        text += String(payload.delta ?? "");
      } else if (eventType === "run_end") {
        reportEvent = {
          status: "completed",
          report: (payload as { report?: ReportEvent["report"] }).report,
        };
      }
    }

    return {
      agents: withQueuedAgents([...agentMap.values()]),
      searches: [...searchMap.values()].sort(
        (left, right) => (left.index ?? 0) - (right.index ?? 0),
      ),
      sources: [...sourceMap.values()],
      score: scoreEvent,
      report: reportEvent,
      markdown: text,
    };
  }, [domainEvents]);

  const isRunning = runOutcome === "running";
  const displayStatus = localError ? "error" : runOutcome;

  async function submit(message: string, body: Record<string, unknown>) {
    stopPolling();
    setRunOutcome("running");
    setLocalError(undefined);
    setDomainEvents([]);
    lastSequenceRef.current = 0;

    try {
      const token = await getToken();
      if (!token) throw new Error("Your session has expired. Please sign in again.");
      const startup = body.startup as StartupPayload | undefined;
      if (!startup?.idea) throw new Error("A startup idea is required.");

      const project = await createProject(token, startup);
      setProjectId(project.id);
      const run = await dispatchRun(token, project.id, startup, message);
      setRunId(run.id);
      await pollRun(run.id, token);
    } catch (submissionError) {
      setLocalError(
        submissionError instanceof Error
          ? submissionError.message
          : "Could not start the research run.",
      );
      setRunOutcome("error");
    }
  }

  async function cancelRun() {
    stopPolling();
    setRunOutcome("cancelled");
    if (!runId) return;
    try {
      const token = await getToken();
      if (token) await cancelPersistedRun(token, runId);
    } catch (cancelError) {
      setLocalError(
        cancelError instanceof Error ? cancelError.message : "Could not cancel the run.",
      );
      setRunOutcome("error");
    }
  }

  return {
    agents,
    searches,
    sources,
    score,
    report,
    markdown,
    projectId,
    isRunning,
    displayStatus,
    error: localError,
    submit,
    cancelRun,
  };
}
