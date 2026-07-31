"use client";

import { useCallback, useMemo, useState } from "react";
import { AnalystNotes } from "@/components/canvas/analyst-notes";
import { AssumptionBoard } from "@/components/canvas/assumption-board";
import { CanvasRail, type RailItem } from "@/components/canvas/canvas-rail";
import { CompetitorBoard } from "@/components/canvas/competitor-board";
import { EvidenceBoard } from "@/components/canvas/evidence-board";
import {
  ExperimentBoard,
  type ExperimentStatus,
} from "@/components/canvas/experiment-board";
import { MarketPanel } from "@/components/canvas/market-panel";
import { MoatGtmPanel } from "@/components/canvas/moat-gtm-panel";
import { SourcesPanel } from "@/components/canvas/sources-panel";
import { ThesisGrid } from "@/components/canvas/thesis-grid";
import { VerdictHero } from "@/components/canvas/verdict-hero";
import { ReportToolbar } from "@/components/report-toolbar";
import { buildCanvasModel, type AssumptionStatus } from "@/lib/report-canvas";
import type { StructuredReport } from "@/lib/report-types";
import type { Source, StartupPayload } from "@/lib/types";

function scrollToId(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  const top = target.getBoundingClientRect().top + window.scrollY - 76;
  window.scrollTo({ top, behavior: "smooth" });
}

/**
 * The canvas is the only view of a finished run. The Markdown report is still
 * produced by the backend and stays available through Copy and Download, and
 * every narrative part of it (score explanation, per-agent notes) is surfaced as
 * a section here.
 *
 * Assumption and experiment statuses are deliberately local component state.
 * Nothing is persisted yet, so the UI says so rather than implying a save.
 */
export function StartupCanvas({
  report,
  payload,
  markdown,
  sources,
}: {
  report: StructuredReport;
  payload?: StartupPayload;
  markdown?: string;
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

  const competitors = (report.competitor_snapshot ?? []).filter((competitor) =>
    competitor.name?.trim(),
  );
  const hasMoat = Boolean(report.moat_analysis || report.gtm_strategy);
  const hasMarket = Boolean(report.market_analysis);
  const evidenceCount =
    model.evidence.supporting.length +
    model.evidence.contradicting.length +
    model.evidence.unknown.length;

  /*
   * The rail and the page are derived from one ordered list, so a section can
   * never appear in the contents without rendering, or the reverse.
   */
  const sections: (RailItem & { render: () => React.ReactNode })[] = [];

  if (model.thesis.length > 0) {
    sections.push({
      id: "thesis",
      label: "Thesis",
      count: model.thesis.length,
      render: () => <ThesisGrid cards={model.thesis} />,
    });
  }
  if (model.assumptions.length > 0) {
    sections.push({
      id: "assumptions",
      label: "Assumptions",
      count: model.assumptions.length,
      render: () => (
        <AssumptionBoard
          assumptions={model.assumptions}
          experiments={model.experiments}
          statuses={assumptionStatuses}
          onStatusChange={setAssumptionStatus}
          onOpenExperiment={openExperiment}
        />
      ),
    });
  }
  if (model.experiments.length > 0) {
    sections.push({
      id: "experiments",
      label: "Experiments",
      count: model.experiments.length,
      render: () => (
        <ExperimentBoard
          experiments={model.experiments}
          statuses={experimentStatuses}
          focusedId={focusedExperiment}
          onStatusChange={setExperimentStatus}
        />
      ),
    });
  }
  if (evidenceCount > 0) {
    sections.push({
      id: "evidence",
      label: "Evidence",
      count: evidenceCount,
      render: () => <EvidenceBoard evidence={model.evidence} />,
    });
  }
  if (hasMarket) {
    sections.push({
      id: "market",
      label: "Market",
      render: () => <MarketPanel market={report.market_analysis} />,
    });
  }
  if (competitors.length > 0) {
    sections.push({
      id: "competitors",
      label: "Competitors",
      count: competitors.length,
      render: () => <CompetitorBoard competitors={competitors} />,
    });
  }
  if (hasMoat) {
    sections.push({
      id: "moat",
      label: "Moat & GTM",
      render: () => (
        <MoatGtmPanel moat={report.moat_analysis} gtm={report.gtm_strategy} />
      ),
    });
  }
  if (model.analystNotes.length > 0) {
    sections.push({
      id: "notes",
      label: "Analyst notes",
      count: model.analystNotes.length,
      render: () => <AnalystNotes notes={model.analystNotes} />,
    });
  }
  if (reportSources.length > 0) {
    sections.push({
      id: "sources",
      label: "Sources",
      count: reportSources.length,
      render: () => <SourcesPanel sources={reportSources} />,
    });
  }

  const railItems: RailItem[] = sections.map(({ render: _render, ...item }) => item);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[164px_minmax(0,1fr)] xl:gap-10">
      <CanvasRail items={railItems} onNavigate={scrollToId} />

      <div className="min-w-0 space-y-7">
        <VerdictHero
          decision={model.decision}
          dimensions={model.dimensions}
          scoreExplanation={model.scoreExplanation}
          onStartExperiments={
            model.experiments.length > 0
              ? () => scrollToId("experiments")
              : undefined
          }
        />

        {sections.map((section) => (
          <div key={section.id}>{section.render()}</div>
        ))}

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
          <p className="max-w-xl text-[12px] leading-relaxed text-muted-foreground">
            Statuses you set on assumptions and experiments live in this browser
            tab only — they are not saved yet.
            {markdown && " The long-form write-up is still generated:"}
          </p>
          {markdown && <ReportToolbar markdown={markdown} />}
        </footer>
      </div>
    </div>
  );
}
