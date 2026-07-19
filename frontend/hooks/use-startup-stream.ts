"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useState } from "react";
import { withQueuedAgents } from "@/lib/agent-meta";
import type {
  AgentEvent,
  ReportEvent,
  ScoreEvent,
  SearchEvent,
} from "@/lib/types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:3000"
).replace(/\/$/, "");

export type RunOutcome = "idle" | "running" | "done" | "cancelled" | "error";

export function useStartupStream() {
  const [localError, setLocalError] = useState<string>();
  const [assistantBaseline, setAssistantBaseline] = useState(0);
  const [runOutcome, setRunOutcome] = useState<RunOutcome>("idle");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${API_BASE_URL}/startup/stress-test/v2/stream`,
      }),
    [],
  );

  const { messages, sendMessage, status, error, stop, clearError } = useChat({
    transport,
    onError: (chatError) => {
      setLocalError(chatError.message);
      setRunOutcome("error");
    },
    onFinish: ({ isAbort, isError }) => {
      setRunOutcome(isAbort ? "cancelled" : isError ? "error" : "done");
    },
  });

  const assistantMessages = messages.filter(
    (message) => message.role === "assistant",
  );
  const latestAssistant =
    assistantMessages.length > assistantBaseline
      ? assistantMessages[assistantMessages.length - 1]
      : undefined;

  const { agents, searches, sources, score, report, markdown } = useMemo(() => {
    const agentMap = new Map<string, AgentEvent>();
    const searchMap = new Map<number, SearchEvent>();
    const sourceMap = new Map<string, { url: string; title?: string }>();
    let scoreEvent: ScoreEvent | undefined;
    let reportEvent: ReportEvent | undefined;
    let text = "";

    for (const part of latestAssistant?.parts ?? []) {
      const partType = part.type as string;
      if (partType === "text") {
        text += (part as { text: string }).text;
      } else if (partType === "data-agent") {
        const event = (part as { data: AgentEvent }).data;
        agentMap.set(event.agent, event);
      } else if (partType === "data-search") {
        const event = (part as { data: SearchEvent }).data;
        if (event.index) searchMap.set(event.index, event);
      } else if (partType === "data-score") {
        scoreEvent = (part as { data: ScoreEvent }).data;
      } else if (partType === "data-report") {
        reportEvent = (part as { data: ReportEvent }).data;
      } else if (partType === "source-url") {
        const source = part as { url: string; title?: string };
        if (source.url) sourceMap.set(source.url, source);
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
  }, [latestAssistant]);

  const isRunning = status === "submitted" || status === "streaming";
  const displayStatus = localError || error
    ? "error"
    : isRunning
      ? status
      : runOutcome;

  async function submit(message: string, body: Record<string, unknown>) {
    setAssistantBaseline(assistantMessages.length);
    setRunOutcome("running");
    setLocalError(undefined);
    clearError();
    await sendMessage({ text: message }, { body });
  }

  function cancelRun() {
    setRunOutcome("cancelled");
    stop();
  }

  return {
    agents,
    searches,
    sources,
    score,
    report,
    markdown,
    isRunning,
    displayStatus,
    error: localError || error?.message,
    submit,
    cancelRun,
  };
}
