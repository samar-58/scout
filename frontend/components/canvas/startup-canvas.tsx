"use client";

import {
  Compass,
  Crosshair,
  FlaskConical,
  Link2,
  NotebookPen,
  Route,
  Scale,
  ShieldQuestion,
  TrendingUp,
} from "lucide-react";
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
  const top = target.getBoundingClientRect().top + window.scrollY - 84;
  window.scrollTo({ top, behavior: "smooth" });
}

/**
 * The canvas is the only view of a finished run. The Markdown report is no
 * longer rendered — reading a document was the least useful thing a founder
 * could do with this data — but it is still produced by the backend and stays
 * available through Copy and Download in the header, and every narrative part
 * of it (score explanation, per-agent notes) is surfaced as a panel here.
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
   * Section numbering has to follow what is actually rendered, so the rail and
   * the chapter numbers are derived from one ordered list instead of being
   * hardcoded twice.
   */
  const sections: (RailItem & { render: (index: number) => React.ReactNode })[] =
    [];

  if (model.thesis.length > 0) {
    sections.push({
      id: "thesis",
      label: "Thesis",
      icon: Compass,
      count: model.thesis.length,
      render: (index) => <ThesisGrid cards={model.thesis} index={index} />,
    });
  }
  if (model.assumptions.length > 0) {
    sections.push({
      id: "assumptions",
      label: "Assumptions",
      icon: ShieldQuestion,
      count: model.assumptions.length,
      render: (index) => (
        <AssumptionBoard
          assumptions={model.assumptions}
          experiments={model.experiments}
          statuses={assumptionStatuses}
          index={index}
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
      icon: FlaskConical,
      count: model.experiments.length,
      render: (index) => (
        <ExperimentBoard
          experiments={model.experiments}
          statuses={experimentStatuses}
          focusedId={focusedExperiment}
          index={index}
          onStatusChange={setExperimentStatus}
        />
      ),
    });
  }
  if (evidenceCount > 0) {
    sections.push({
      id: "evidence",
      label: "Evidence",
      icon: Scale,
      count: evidenceCount,
      render: (index) => (
        <EvidenceBoard evidence={model.evidence} index={index} />
      ),
    });
  }
  if (hasMarket) {
    sections.push({
      id: "market",
      label: "Market",
      icon: TrendingUp,
      render: (index) => (
        <MarketPanel market={report.market_analysis} index={index} />
      ),
    });
  }
  if (competitors.length > 0) {
    sections.push({
      id: "competitors",
      label: "Competitors",
      icon: Crosshair,
      count: competitors.length,
      render: (index) => (
        <CompetitorBoard competitors={competitors} index={index} />
      ),
    });
  }
  if (hasMoat) {
    sections.push({
      id: "moat",
      label: "Moat & GTM",
      icon: Route,
      render: (index) => (
        <MoatGtmPanel
          moat={report.moat_analysis}
          gtm={report.gtm_strategy}
          index={index}
        />
      ),
    });
  }
  if (model.analystNotes.length > 0) {
    sections.push({
      id: "notes",
      label: "Analyst notes",
      icon: NotebookPen,
      count: model.analystNotes.length,
      render: (index) => (
        <AnalystNotes notes={model.analystNotes} index={index} />
      ),
    });
  }
  if (reportSources.length > 0) {
    sections.push({
      id: "sources",
      label: "Sources",
      icon: Link2,
      count: reportSources.length,
      render: (index) => (
        <SourcesPanel sources={reportSources} index={index} />
      ),
    });
  }

  const railItems: RailItem[] = sections.map(({ render: _render, ...item }) => item);

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[188px_minmax(0,1fr)] xl:gap-7">
      <CanvasRail items={railItems} onNavigate={scrollToId} />

      <div className="stagger min-w-0 space-y-4 sm:space-y-5">
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

        {markdown && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Need the long-form write-up? It is still generated — take it as
              Markdown.
            </p>
            <ReportToolbar markdown={markdown} />
          </div>
        )}

        {sections.map((section, position) => (
          <div key={section.id}>{section.render(position + 1)}</div>
        ))}

        <p className="px-1 pb-2 text-[11.5px] leading-relaxed text-muted-foreground">
          Statuses you set here are not saved yet — they live in this browser tab
          only and reset when the run ends.
        </p>
      </div>
    </div>
  );
}
