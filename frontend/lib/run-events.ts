/**
 * Reducing persisted domain events into the view models the UI renders.
 *
 * This logic used to live inside the streaming hook, which meant only a *live*
 * run could show agents and searches — reopening a saved run showed status and
 * nothing else, even though every event was already in the database. Pulling it
 * out lets the run view and the saved-project history render from one reducer,
 * and makes the reduction testable without a browser.
 *
 * Events are append-only and ordered by `sequence`; later events for the same
 * agent or search index supersede earlier ones.
 */

import { withQueuedAgents } from "@/lib/agent-meta";
import type { StreamEventRecord } from "@/lib/scout-api";
import type {
  AgentEvent,
  ReportEvent,
  ScoreEvent,
  SearchEvent,
  Source,
} from "@/lib/types";

export interface AgentActivity extends AgentEvent {
  /**
   * When this specialist entered its current state, taken from the event's own
   * timestamp. Polling delivers events in batches, so the UI needs the server's
   * clock to run a live counter between polls instead of jumping in 900ms steps.
   */
  since?: string;
}

export interface SearchActivity extends SearchEvent {
  since?: string;
}

export interface RunActivity {
  agents: AgentActivity[];
  searches: SearchActivity[];
  sources: Source[];
  score?: ScoreEvent;
  report?: ReportEvent;
  markdown: string;
}

export const EMPTY_ACTIVITY: RunActivity = {
  agents: [],
  searches: [],
  sources: [],
  markdown: "",
};

export function reduceRunEvents(
  records: StreamEventRecord[],
  { includeQueuedAgents = true }: { includeQueuedAgents?: boolean } = {},
): RunActivity {
  const agentMap = new Map<string, AgentActivity>();
  const searchMap = new Map<number, SearchActivity>();
  const sourceMap = new Map<string, Source>();
  let score: ScoreEvent | undefined;
  let report: ReportEvent | undefined;
  let markdown = "";

  for (const record of records) {
    const payload = record.payload;
    const eventType = String(payload.type ?? record.event_type);

    if (eventType === "agent_status") {
      const event = payload as unknown as AgentEvent;
      if (!event.agent) continue;
      const previous = agentMap.get(event.agent);
      agentMap.set(event.agent, {
        ...event,
        // The clock restarts whenever the state changes, and otherwise keeps the
        // timestamp of the event that put the agent into this state.
        since:
          previous && previous.status === event.status
            ? previous.since
            : record.created_at,
      });
      continue;
    }

    if (
      eventType === "search_start" ||
      eventType === "search_end" ||
      eventType === "evidence_ready"
    ) {
      const event = payload as unknown as SearchEvent;
      if (typeof event.index !== "number") continue;
      const previous = searchMap.get(event.index);
      // Merge, so a `search_end` carrying only results does not erase the query
      // and purpose recorded by `search_start`.
      searchMap.set(event.index, {
        ...previous,
        ...event,
        since:
          previous && previous.status === event.status
            ? previous.since
            : record.created_at,
      });
      continue;
    }

    if (eventType === "score") {
      score = payload as unknown as ScoreEvent;
      continue;
    }

    if (eventType === "source") {
      const source = (payload as { source?: Source }).source;
      if (source?.url) {
        sourceMap.set(source.url, { url: source.url, title: source.title });
      }
      continue;
    }

    if (eventType === "report_delta") {
      markdown += String(payload.delta ?? "");
      continue;
    }

    if (eventType === "run_end") {
      report = {
        status: "completed",
        report: (payload as { report?: ReportEvent["report"] }).report,
      };
    }
  }

  const agents = [...agentMap.values()];

  return {
    // A live run shows all seven specialists immediately, queued ones included.
    // A finished run should not invent specialists that never reported.
    agents: includeQueuedAgents ? withQueuedAgents(agents) : agents,
    searches: [...searchMap.values()].sort(
      (left, right) => (left.index ?? 0) - (right.index ?? 0),
    ),
    sources: [...sourceMap.values()],
    score,
    report,
    markdown,
  };
}

/** Highest sequence seen, for `?after=` polling. */
export function lastSequence(records: StreamEventRecord[]): number {
  return records.length === 0 ? 0 : records[records.length - 1].sequence;
}
