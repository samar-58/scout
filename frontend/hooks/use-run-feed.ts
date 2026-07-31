"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  cancelRun as cancelPersistedRun,
  getRun,
  listRunEvents,
  type ResearchRunRecord,
  type ResearchRunStatus,
  type StreamEventRecord,
} from "@/lib/scout-api";
import { reduceRunEvents } from "@/lib/run-events";

const POLL_INTERVAL_MS = 800;
/**
 * Polls that may fail without the run being in trouble. The work happens in a
 * durable worker, so a failed read says nothing about the run — only about this
 * browser's last request.
 */
const MAX_CONSECUTIVE_POLL_FAILURES = 6;

const ACTIVE_STATUSES: ResearchRunStatus[] = ["queued", "running"];

/**
 * Follows one persisted run: its ordered events and its status.
 *
 * This is the only place that polls. It lives here rather than inside the
 * composer because a run outlives the page that started it — the composer
 * dispatches and navigates to the project, and the project follows the run from
 * whatever point the user arrives at, including a reload halfway through.
 */
export function useRunFeed(runId?: string) {
  const { getToken } = useAuth();
  const [events, setEvents] = useState<StreamEventRecord[]>([]);
  const [run, setRun] = useState<ResearchRunRecord>();
  const [error, setError] = useState<string>();
  const [warning, setWarning] = useState<string>();
  const [settledRunId, setSettledRunId] = useState<string>();

  const lastSequenceRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failuresRef = useRef(0);
  /*
   * Incremented whenever following should stop or switch runs. A cycle already
   * in flight compares the generation it started with before scheduling the next
   * tick, so switching runs can never leave an orphaned loop writing state.
   */
  const generationRef = useRef(0);

  const stop = useCallback(() => {
    generationRef.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const poll = useCallback(
    async (activeRunId: string, generation: number) => {
      if (generation !== generationRef.current) return;

      try {
        /*
         * A fresh token every cycle. Clerk session tokens are short-lived, so
         * capturing one token for a whole run started failing with 401 about a
         * minute in — and the run looked failed while the worker was fine.
         * getToken serves a cached token until it is near expiry, so this is
         * cheap.
         */
        const token = await getToken();
        if (!token) throw new Error("Your session has expired. Please sign in again.");

        const [nextEvents, nextRun] = await Promise.all([
          listRunEvents(token, activeRunId, lastSequenceRef.current),
          getRun(token, activeRunId),
        ]);
        if (generation !== generationRef.current) return;

        const append = (batch: StreamEventRecord[]) => {
          if (batch.length === 0) return;
          lastSequenceRef.current = batch[batch.length - 1].sequence;
          setEvents((current) => [...current, ...batch]);
        };
        append(nextEvents);
        setRun(nextRun);
        failuresRef.current = 0;
        setWarning(undefined);

        if (!ACTIVE_STATUSES.includes(nextRun.status)) {
          // The run and its terminal events commit atomically, but the parallel
          // requests above can observe opposite sides of that commit. A second
          // read after terminal status is visible drains the tail.
          append(await listRunEvents(token, activeRunId, lastSequenceRef.current));
          if (generation !== generationRef.current) return;
          if (nextRun.status === "failed") {
            setError(nextRun.error_message ?? "Research run failed.");
          }
          setSettledRunId(activeRunId);
          stop();
          return;
        }
      } catch (pollError) {
        if (generation !== generationRef.current) return;
        failuresRef.current += 1;
        const message =
          pollError instanceof Error ? pollError.message : "Could not reach Scout.";

        if (failuresRef.current >= MAX_CONSECUTIVE_POLL_FAILURES) {
          setError(
            `Lost contact with the run: ${message} The research may still be running — reload to check.`,
          );
          stop();
          return;
        }
        // Transient: keep the view intact, say so quietly, and retry.
        setWarning("Reconnecting…");
      }

      if (generation !== generationRef.current) return;
      // Back off while failures persist so a flaky connection is not hammered.
      timerRef.current = setTimeout(
        () => void poll(activeRunId, generation),
        POLL_INTERVAL_MS * (failuresRef.current + 1),
      );
    },
    [getToken, stop],
  );

  useEffect(() => {
    stop();
    setEvents([]);
    setRun(undefined);
    setError(undefined);
    setWarning(undefined);
    lastSequenceRef.current = 0;
    failuresRef.current = 0;
    if (!runId) return;
    const generation = generationRef.current;
    void poll(runId, generation);
    return stop;
  }, [runId, poll, stop]);

  const activity = useMemo(() => reduceRunEvents(events), [events]);

  const status = run?.status;
  const isActive = status ? ACTIVE_STATUSES.includes(status) : Boolean(runId);

  async function cancel() {
    if (!runId) return;
    stop();
    try {
      const token = await getToken();
      if (token) setRun(await cancelPersistedRun(token, runId));
    } catch (cancelError) {
      setError(
        cancelError instanceof Error ? cancelError.message : "Could not cancel the run.",
      );
    }
  }

  return {
    activity,
    run,
    status,
    isActive,
    error,
    /** Set while a poll is failing but the run is still assumed alive. */
    warning,
    /** Run id whose terminal state has been observed — the cue to reload data. */
    settledRunId,
    cancel,
  };
}
