"use client";

import { useCallback, useMemo, useState } from "react";
import { AssumptionBoard } from "@/components/canvas/assumption-board";
import { CompetitorBoard } from "@/components/canvas/competitor-board";
import { DecisionHeader } from "@/components/canvas/decision-header";
import { EvidenceBoard } from "@/components/canvas/evidence-board";
import {
  ExperimentBoard,
  type ExperimentStatus,
} from "@/components/canvas/experiment-board";
import { MarketPanel } from "@/components/canvas/market-panel";
import { MoatGtmPanel } from "@/components/canvas/moat-gtm-panel";
import { SourcesPanel } from "@/components/canvas/sources-panel";
import { ThesisGrid } from "@/components/canvas/thesis-grid";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { buildCanvasModel, type AssumptionStatus } from "@/lib/report-canvas";
import type { StructuredReport } from "@/lib/report-types";
import type { ScoreEvent, Source, StartupPayload } from "@/lib/types";

const JUMP_LINKS = [
  { id: "assumptions", label: "Assumptions" },
  { id: "experiments", label: "Experiments" },
  { id: "evidence", label: "Evidence" },
  { id: "market", label: "Market" },
  { id: "competitors", label: "Competitors" },
  { id: "moat", label: "Moat & GTM" },
  { id: "sources", label: "Sources" },
];

function scrollToId(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  const top = target.getBoundingClientRect().top + window.scrollY - 76;
  window.scrollTo({ top, behavior: "smooth" });
}

/**
 * The canvas is the primary view of a finished run: a decision, the thesis it
 * rests on, the assumptions that are still open, and the experiments that would
 * close them. The Markdown report remains available as a separate tab.
 *
 * Assumption and experiment statuses are deliberately local component state.
 * Nothing is persisted yet, so the UI says so rather than implying a save.
 */
export function StartupCanvas({
  report,
  payload,
  score,
  sources,
}: {
  report: StructuredReport;
  payload?: StartupPayload;
  score?: ScoreEvent;
  sources: Source[];
}) {
  const model = useMemo(() => buildCanvasModel(report, payload), [report, payload]);
  const [assumptionStatuses, setAssumptionStatuses] = useState<
    Record<string, AssumptionStatus>
  >({});
  const [experimentStatuses, setExperimentStatuses] = useState<
    Record<string, ExperimentStatus>
  >({});
  const [focusedExperiment, setFocusedExperiment] = useState<string>();

  const setAssumptionStatus = useCallback(
    (id: string, status: AssumptionStatus) =>
      setAssumptionStatuses((current) => ({ ...current, [id]: status })),
    [],
  );

  const setExperimentStatus = useCallback(
    (id: string, status: ExperimentStatus) =>
      setExperimentStatuses((current) => ({ ...current, [id]: status })),
    [],
  );

  const openExperiment = useCallback((experimentId: string) => {
    setFocusedExperiment(experimentId);
    scrollToId(experimentId);
  }, []);

  const reportSources = sources.length
    ? sources
    : (report.sources ?? []).map((source) => ({
        url: source.url,
        title: source.title,
      }));

  return (
    <div className="space-y-4">
      <DecisionHeader
        decision={model.decision}
        onStartExperiments={
          model.experiments.length > 0
            ? () => scrollToId("experiments")
            : undefined
        }
      />

      <nav
        aria-label="Canvas sections"
        className="scroll-touch -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
      >
        {JUMP_LINKS.map((link) => (
          <button
            key={link.id}
            type="button"
            onClick={() => scrollToId(link.id)}
            className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground/70 transition-colors hover:border-brand/40 hover:text-foreground"
          >
            {link.label}
          </button>
        ))}
      </nav>

      {score && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <ScoreBreakdown score={score} />
        </div>
      )}

      <ThesisGrid cards={model.thesis} />

      <AssumptionBoard
        assumptions={model.assumptions}
        experiments={model.experiments}
        statuses={assumptionStatuses}
        onStatusChange={setAssumptionStatus}
        onOpenExperiment={openExperiment}
      />

      <ExperimentBoard
        experiments={model.experiments}
        statuses={experimentStatuses}
        focusedId={focusedExperiment}
        onStatusChange={setExperimentStatus}
      />

      <EvidenceBoard evidence={model.evidence} />
      <MarketPanel market={report.market_analysis} />
      <CompetitorBoard competitors={report.competitor_snapshot} />
      <MoatGtmPanel moat={report.moat_analysis} gtm={report.gtm_strategy} />
      <SourcesPanel sources={reportSources} />

      <p className="px-1 pb-2 text-[11.5px] leading-relaxed text-muted-foreground">
        Statuses you set here are not saved yet — they live in this browser tab
        only and reset when the run ends.
      </p>
    </div>
  );
}
