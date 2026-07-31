"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { AgentList } from "@/components/run/agent-list";
import { SearchLog } from "@/components/run/search-log";
import { listRunEvents, type StreamEventRecord } from "@/lib/scout-api";
import { EMPTY_ACTIVITY, reduceRunEvents, type RunActivity } from "@/lib/run-events";

/**
 * The specialists and searches of a *saved* run, replayed from its events.
 *
 * Everything the live view shows is persisted as ordered domain events, but
 * reopening a project only showed status and phase ticks — the queries, the
 * sources, and each specialist's findings were in the database and nowhere on
 * screen. This reads them back through the same reducer and the same two
 * components the live run uses, so a finished run looks like the run you watched.
 *
 * Events load when the row is opened, not with the page: a run carries hundreds
 * of them and most visits open none.
 */
export function RunActivity({ runId, live }: { runId: string; live?: boolean }) {
  const { getToken } = useAuth();
  const [activity, setActivity] = useState<RunActivity>(EMPTY_ACTIVITY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session has expired. Please sign in again.");
      const records: StreamEventRecord[] = await listRunEvents(token, runId, 0);
      // A finished run should not invent specialists that never reported; a live
      // one shows the full roster so pending work is visible.
      setActivity(reduceRunEvents(records, { includeQueuedAgents: Boolean(live) }));
      setError(undefined);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load this run's activity.",
      );
    } finally {
      setLoading(false);
    }
  }, [getToken, runId, live]);

  useEffect(() => {
    void load();
  }, [load]);

  // A run still in flight keeps catching up while the row stays open.
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => void load(), 2500);
    return () => clearInterval(timer);
  }, [live, load]);

  if (loading) {
    return (
      <div className="space-y-2 py-3">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="py-3 text-[12.5px] text-destructive">{error}</p>;
  }

  if (activity.agents.length === 0 && activity.searches.length === 0) {
    return (
      <p className="py-3 text-[12.5px] text-muted-foreground">
        This run recorded no specialist or search activity.
      </p>
    );
  }

  return (
    <div className="grid gap-x-10 gap-y-6 py-3 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
      <div>
        <h4 className="label pb-2.5">Specialists</h4>
        <AgentList agents={activity.agents} />
      </div>
      <div>
        <h4 className="label pb-2.5">Web research</h4>
        <SearchLog searches={activity.searches} />
      </div>
    </div>
  );
}
