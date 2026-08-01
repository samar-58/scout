"use client";

import { useMemo } from "react";
import { AnalystNotes } from "@/components/canvas/analyst-notes";
import { AssumptionBoard } from "@/components/canvas/assumption-board";
import { CanvasRail, type RailItem } from "@/components/canvas/canvas-rail";
import { CompetitorBoard } from "@/components/canvas/competitor-board";
import { EvidenceBoard } from "@/components/canvas/evidence-board";
import { ExperimentBoard } from "@/components/canvas/experiment-board";
import { MarketPanel } from "@/components/canvas/market-panel";
import { MoatGtmPanel } from "@/components/canvas/moat-gtm-panel";
import { SourcesPanel } from "@/components/canvas/sources-panel";
import { ThesisGrid } from "@/components/canvas/thesis-grid";
import { VerdictHero } from "@/components/canvas/verdict-hero";
import { ReportToolbar } from "@/components/report-toolbar";
import { buildCanvasModel, type CanvasEvidence, type EvidenceItem } from "@/lib/report-canvas";
import type { StructuredReport } from "@/lib/report-types";
import type { ClaimRecord, EvidenceRecord } from "@/lib/scout-api";
import type { Source, StartupPayload } from "@/lib/types";

function scrollToId(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  const top = target.getBoundingClientRect().top + window.scrollY - 76;
  window.scrollTo({ top, behavior: "smooth" });
}

export interface CanvasLoopSummary {
  openAssumptions: number;
  activeExperiments: number;
  pendingDecisions: number;
}

/**
 * Point-in-time report view for a finished run.
 *
 * Mutations live on Validate. This surface reshapes the structured report (and
 * persisted claims/evidence when available) into a readable canvas, then hands
 * the founder back to the living loop.
 */
export function StartupCanvas({
  report,
  payload,
  markdown,
  sources,
  reportCreatedAt,
  runId,
  claims,
  evidenceRecords,
  loopSummary,
  onOpenValidate,
}: {
  report: StructuredReport;
  payload?: StartupPayload;
  markdown?: string;
  sources: Source[];
  reportCreatedAt?: string;
  runId?: string | null;
  claims?: ClaimRecord[];
  evidenceRecords?: EvidenceRecord[];
  loopSummary?: CanvasLoopSummary;
  onOpenValidate?: (sectionId?: string) => void;
}) {
  const model = useMemo(() => buildCanvasModel(report, payload), [report, payload]);

  const persistedEvidence = useMemo(
    () =>
      buildPersistedEvidence(
        claims ?? [],
        evidenceRecords ?? [],
        runId ?? undefined,
      ),
    [claims, evidenceRecords, runId],
  );
  const evidence = persistedEvidence ?? model.evidence;

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
    evidence.supporting.length +
    evidence.contradicting.length +
    evidence.unknown.length;

  const sections: (RailItem & { render: () => React.ReactNode })[] = [];

  if (model.thesis.length > 0) {
    sections.push({
      id: "thesis",
      label: "Thesis",
      count: model.thesis.length,
      render: () => (
        <ThesisGrid
          cards={model.thesis}
          updatedAt={reportCreatedAt}
          claims={claims}
          onOpenValidate={onOpenValidate}
        />
      ),
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
          onOpenValidate={onOpenValidate}
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
          onOpenValidate={() => onOpenValidate?.("experiments")}
        />
      ),
    });
  }
  if (evidenceCount > 0) {
    sections.push({
      id: "evidence",
      label: "Evidence",
      count: evidenceCount,
      render: () => <EvidenceBoard evidence={evidence} />,
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
        {loopSummary && (
          <p className="text-[12.5px] text-muted-foreground">
            Living loop:{" "}
            <span className="tabular-nums text-foreground/80">
              {loopSummary.openAssumptions}
            </span>{" "}
            open assumptions ·{" "}
            <span className="tabular-nums text-foreground/80">
              {loopSummary.activeExperiments}
            </span>{" "}
            active experiments ·{" "}
            <span className="tabular-nums text-foreground/80">
              {loopSummary.pendingDecisions}
            </span>{" "}
            pending decisions
          </p>
        )}

        <VerdictHero
          decision={model.decision}
          dimensions={model.dimensions}
          scoreExplanation={model.scoreExplanation}
          onStartExperiments={
            onOpenValidate
              ? () => onOpenValidate("experiments")
              : undefined
          }
        />

        {sections.map((section) => (
          <div key={section.id}>{section.render()}</div>
        ))}

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
          <p className="max-w-xl text-[12px] leading-relaxed text-muted-foreground">
            This is a point-in-time report. Assumptions, experiments, and decisions
            are tracked on Validate.
            {markdown && " The long-form write-up is still available:"}
          </p>
          {markdown && <ReportToolbar markdown={markdown} />}
        </footer>
      </div>
    </div>
  );
}

function buildPersistedEvidence(
  claims: ClaimRecord[],
  evidenceRecords: EvidenceRecord[],
  runId: string | undefined,
): CanvasEvidence | null {
  const scoped = runId
    ? claims.filter((claim) => claim.run_id === runId)
    : claims;
  if (scoped.length === 0) return null;

  const byClaim = new Map<string, EvidenceRecord[]>();
  for (const record of evidenceRecords) {
    if (!record.claim_id) continue;
    if (runId && record.run_id && record.run_id !== runId) continue;
    const list = byClaim.get(record.claim_id) ?? [];
    list.push(record);
    byClaim.set(record.claim_id, list);
  }

  const supporting: EvidenceItem[] = [];
  const contradicting: EvidenceItem[] = [];
  const unknown: EvidenceItem[] = [];

  for (const claim of scoped) {
    const linked = byClaim.get(claim.id) ?? [];
    const primary = linked[0];
    const item: EvidenceItem = {
      text: claim.text,
      origin: claim.origin,
      claimId: claim.id,
      stance: claim.stance,
      snippet: primary?.snippet ?? undefined,
      sourceUrl: primary?.source_url ?? undefined,
      sourceTitle: primary?.source_title ?? undefined,
      workflow: primary?.workflow ?? undefined,
      createdAt: primary?.created_at ?? claim.created_at,
    };
    if (claim.stance === "supporting" || claim.stance === "pain") {
      supporting.push(item);
    } else if (claim.stance === "contradicting" || claim.stance === "competitor") {
      contradicting.push(item);
    } else {
      unknown.push(item);
    }
  }

  return { supporting, contradicting, unknown };
}
