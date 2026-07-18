"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Circle,
  ExternalLink,
  LoaderCircle,
  Search,
  Send,
  Square,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import type {
  AgentEvent,
  ReportEvent,
  ScoreEvent,
  SearchEvent,
  StartupFormState,
  StartupPayload,
} from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

const initialForm: StartupFormState = {
  idea: "",
  problem: "",
  targetCustomer: "",
  geography: "",
  businessModel: "",
  currentAlternatives: "",
  customerPain: "",
  proposedSolution: "",
  gtmConstraints: "",
  pricingHypothesis: "",
  stage: "",
  traction: "",
  teamContext: "",
  knownCompetitors: "",
};

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function csv(value: string) {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function toPayload(form: StartupFormState): StartupPayload {
  return {
    idea: form.idea.trim(),
    problem: optional(form.problem),
    target_customer: optional(form.targetCustomer),
    geography: optional(form.geography),
    business_model: optional(form.businessModel),
    current_alternatives: csv(form.currentAlternatives),
    customer_pain: optional(form.customerPain),
    proposed_solution: optional(form.proposedSolution),
    gtm_constraints: optional(form.gtmConstraints),
    pricing_hypothesis: optional(form.pricingHypothesis),
    stage: optional(form.stage),
    traction: optional(form.traction),
    team_context: optional(form.teamContext),
    known_competitors: csv(form.knownCompetitors),
  };
}

function readablePrompt(payload: StartupPayload) {
  const context = [
    payload.target_customer && `Target customer: ${payload.target_customer}`,
    payload.geography && `Market: ${payload.geography}`,
    payload.business_model && `Business model: ${payload.business_model}`,
  ].filter(Boolean);
  return `Stress-test this startup idea: ${payload.idea}${
    context.length ? `\n${context.join("\n")}` : ""
  }`;
}

function statusIcon(status: AgentEvent["status"]) {
  if (status === "running") return <LoaderCircle className="spin" size={15} />;
  if (status === "completed") return <Check size={15} />;
  if (status === "failed") return <X size={15} />;
  return <Circle size={12} />;
}

export default function Home() {
  const [form, setForm] = useState(initialForm);
  const [localError, setLocalError] = useState<string>();
  const [assistantBaseline, setAssistantBaseline] = useState(0);
  const [runOutcome, setRunOutcome] = useState<
    "idle" | "running" | "done" | "cancelled" | "error"
  >("idle");
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
      agents: [...agentMap.values()],
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = toPayload(form);
    if (!payload.idea || isRunning) return;
    setAssistantBaseline(assistantMessages.length);
    setRunOutcome("running");
    setLocalError(undefined);
    clearError();
    await sendMessage(
      { text: readablePrompt(payload) },
      { body: { startup: payload } },
    );
  }

  function cancelRun() {
    setRunOutcome("cancelled");
    stop();
  }

  function update<K extends keyof StartupFormState>(
    field: K,
    value: StartupFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">MULTI-AGENT RESEARCH</span>
          <h1>Startup Stress Test</h1>
        </div>
        <span className={`status-pill status-${displayStatus}`}>
          {isRunning && <LoaderCircle className="spin" size={14} />}
          {displayStatus}
        </span>
      </header>

      <div className="workspace">
        <aside className="input-panel panel">
          <div className="panel-heading">
            <div>
              <span className="section-number">01</span>
              <h2>Founder brief</h2>
            </div>
            <p>Only the idea is required. More context sharpens the research.</p>
          </div>

          <form onSubmit={submit}>
            <label>
              Startup idea <span className="required">required</span>
              <textarea
                required
                maxLength={2000}
                rows={5}
                value={form.idea}
                onChange={(event) => update("idea", event.target.value)}
                placeholder="An AI copilot that helps small CPA firms close their books faster..."
              />
            </label>

            <div className="field-grid">
              <label>
                Target customer
                <input
                  value={form.targetCustomer}
                  onChange={(event) => update("targetCustomer", event.target.value)}
                  placeholder="CPA firms with 5–20 staff"
                />
              </label>
              <label>
                Geography
                <input
                  value={form.geography}
                  onChange={(event) => update("geography", event.target.value)}
                  placeholder="United States"
                />
              </label>
              <label>
                Business model
                <input
                  value={form.businessModel}
                  onChange={(event) => update("businessModel", event.target.value)}
                  placeholder="B2B SaaS"
                />
              </label>
              <label>
                Stage
                <input
                  value={form.stage}
                  onChange={(event) => update("stage", event.target.value)}
                  placeholder="Idea / pre-seed"
                />
              </label>
            </div>

            <details>
              <summary>
                Add deeper founder context <ChevronDown size={15} />
              </summary>
              <div className="optional-fields">
                <label>
                  Problem
                  <textarea rows={3} value={form.problem} onChange={(event) => update("problem", event.target.value)} />
                </label>
                <label>
                  Customer pain
                  <textarea rows={3} value={form.customerPain} onChange={(event) => update("customerPain", event.target.value)} />
                </label>
                <label>
                  Proposed solution
                  <textarea rows={3} value={form.proposedSolution} onChange={(event) => update("proposedSolution", event.target.value)} />
                </label>
                <label>
                  Current alternatives <span className="hint">comma-separated</span>
                  <input value={form.currentAlternatives} onChange={(event) => update("currentAlternatives", event.target.value)} />
                </label>
                <label>
                  Known competitors <span className="hint">comma-separated</span>
                  <input value={form.knownCompetitors} onChange={(event) => update("knownCompetitors", event.target.value)} />
                </label>
                <label>
                  GTM constraints
                  <textarea rows={2} value={form.gtmConstraints} onChange={(event) => update("gtmConstraints", event.target.value)} />
                </label>
                <label>
                  Pricing hypothesis
                  <input value={form.pricingHypothesis} onChange={(event) => update("pricingHypothesis", event.target.value)} />
                </label>
                <label>
                  Traction
                  <textarea rows={2} value={form.traction} onChange={(event) => update("traction", event.target.value)} />
                </label>
                <label>
                  Team context
                  <textarea rows={2} value={form.teamContext} onChange={(event) => update("teamContext", event.target.value)} />
                </label>
              </div>
            </details>

            {(localError || error) && (
              <div className="error-box" role="alert">
                <AlertCircle size={17} />
                <span>{localError || error?.message}</span>
              </div>
            )}

            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={!form.idea.trim() || isRunning}>
                <Send size={16} /> Run stress test
              </button>
              {isRunning && (
                <button className="stop-button" type="button" onClick={cancelRun}>
                  <Square size={14} fill="currentColor" /> Stop
                </button>
              )}
            </div>
          </form>
        </aside>

        <section className="results-column">
          <div className="progress-grid">
            <section className="panel compact-panel">
              <div className="panel-title-row">
                <div><span className="section-number">02</span><h2>Agent timeline</h2></div>
                <span>{agents.length}/8</span>
              </div>
              {agents.length === 0 ? (
                <p className="empty-state">Specialist activity will appear here.</p>
              ) : (
                <ol className="timeline">
                  {agents.map((agent) => (
                    <li key={agent.agent} className={`timeline-${agent.status}`}>
                      <span className="timeline-icon">{statusIcon(agent.status)}</span>
                      <div>
                        <strong>{agent.display_name}</strong>
                        <p>{agent.message}</p>
                      </div>
                      {agent.elapsed_ms !== undefined && <time>{(agent.elapsed_ms / 1000).toFixed(1)}s</time>}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="panel compact-panel">
              <div className="panel-title-row">
                <div><span className="section-number">03</span><h2>Search activity</h2></div>
                <span>{searches.filter((item) => item.status === "completed").length}/{searches.length || 8}</span>
              </div>
              {searches.length === 0 ? (
                <p className="empty-state">Tavily queries and evidence will appear here.</p>
              ) : (
                <div className="search-list">
                  {searches.map((item) => (
                    <article key={item.index}>
                      <div className="search-meta">
                        {item.status === "running" ? <LoaderCircle className="spin" size={14} /> : <Search size={14} />}
                        <strong>{item.purpose || `Search ${item.index}`}</strong>
                        <span>{item.result_count ?? "…"}</span>
                      </div>
                      <p>{item.query}</p>
                      {item.error && <small className="search-error">{item.error}</small>}
                      {!!item.top_results?.length && (
                        <div className="inline-sources">
                          {item.top_results.map((source) => source.url && (
                            <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                              {source.title || new URL(source.url).hostname}<ExternalLink size={11} />
                            </a>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="panel report-panel">
            <div className="panel-title-row report-heading">
              <div><span className="section-number">04</span><h2>Research report</h2></div>
              {score && <div className="score-badge"><strong>{score.scores.overall}</strong><span>/100</span></div>}
            </div>
            {markdown ? (
              <article className="markdown"><ReactMarkdown>{markdown}</ReactMarkdown></article>
            ) : (
              <div className="report-placeholder">
                <div className="placeholder-mark">R</div>
                <h3>Your evidence-backed report will stream here</h3>
                <p>Market, competition, customers, distribution, moat, risks, and experiments.</p>
              </div>
            )}
            {!!sources.length && (
              <footer className="source-footer">
                <h3>Verified sources</h3>
                <div>
                  {sources.map((source, index) => (
                    <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {source.title || new URL(source.url).hostname}
                      <ExternalLink size={12} />
                    </a>
                  ))}
                </div>
              </footer>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
