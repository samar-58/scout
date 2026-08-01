"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import {
  addObservation,
  buildValidationSprint,
  confirmDecision,
  listAssumptions,
  listDecisions,
  listExperiments,
  listProjectClaims,
  listProjectEvidence,
  listProjectTimeline,
  listThesisVersions,
  rejectDecision,
  reviewAssumption,
  reviewExperiment,
  updateExperiment,
  type AssumptionRecord,
  type AssumptionReviewState,
  type AssumptionStatusValue,
  type ClaimRecord,
  type DecisionRecord,
  type EvidenceRecord,
  type ExperimentRecord,
  type ExperimentStatus,
  type ObservationKind,
  type ThesisVersionRecord,
  type TimelineEntryRecord,
} from "@/lib/scout-api";

export interface ValidationLoopState {
  assumptions: AssumptionRecord[];
  experiments: ExperimentRecord[];
  decisions: DecisionRecord[];
  thesisVersions: ThesisVersionRecord[];
  timeline: TimelineEntryRecord[];
  claims: ClaimRecord[];
  evidence: EvidenceRecord[];
  loading: boolean;
  busy: string | undefined;
  error: string | undefined;
  notice: string | undefined;
  reload: () => Promise<void>;
  dismissNotice: () => void;
  reviewAssumptionField: (
    id: string,
    review: {
      statement?: string;
      review_state?: AssumptionReviewState;
      status?: AssumptionStatusValue;
      founder_note?: string;
    },
  ) => Promise<void>;
  buildSprint: (assumptionIds: string[]) => Promise<void>;
  moveExperiment: (id: string, status: ExperimentStatus) => Promise<void>;
  recordObservation: (
    experimentId: string,
    observation: {
      kind: ObservationKind;
      text: string;
      numeric_value?: number | null;
      participant_count?: number | null;
    },
  ) => Promise<void>;
  requestReview: (experimentId: string) => Promise<void>;
  confirm: (decisionId: string, changeNote?: string) => Promise<void>;
  reject: (decisionId: string, note?: string) => Promise<void>;
}

/**
 * The persisted validation loop for one project.
 *
 * Every mutation goes through the API and then reloads, so the canvas can never
 * show a state the database does not hold. Reads are batched into one refresh
 * because the five collections are always rendered together.
 */
export function useValidationLoop(projectId: string | undefined): ValidationLoopState {
  const { getToken } = useAuth();
  const [assumptions, setAssumptions] = useState<AssumptionRecord[]>([]);
  const [experiments, setExperiments] = useState<ExperimentRecord[]>([]);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [thesisVersions, setThesisVersions] = useState<ThesisVersionRecord[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntryRecord[]>([]);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(Boolean(projectId));
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const reload = useCallback(async () => {
    if (!projectId) return;
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session has expired. Please sign in again.");
      const [
        nextAssumptions,
        nextExperiments,
        nextDecisions,
        nextThesis,
        nextTimeline,
        nextClaims,
        nextEvidence,
      ] = await Promise.all([
        listAssumptions(token, projectId),
        listExperiments(token, projectId),
        listDecisions(token, projectId),
        listThesisVersions(token, projectId),
        listProjectTimeline(token, projectId),
        listProjectClaims(token, projectId),
        listProjectEvidence(token, projectId),
      ]);
      setAssumptions(nextAssumptions);
      setExperiments(nextExperiments);
      setDecisions(nextDecisions);
      setThesisVersions(nextThesis);
      setTimeline(nextTimeline);
      setClaims(nextClaims);
      setEvidence(nextEvidence);
      setError(undefined);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load the validation loop.",
      );
    } finally {
      setLoading(false);
    }
  }, [getToken, projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const run = useCallback(
    async (
      key: string,
      operation: (token: string) => Promise<string | undefined>,
    ) => {
      setBusy(key);
      setError(undefined);
      setNotice(undefined);
      try {
        const token = await getToken();
        if (!token) throw new Error("Your session has expired. Please sign in again.");
        const message = await operation(token);
        await reload();
        if (message) setNotice(message);
      } catch (operationError) {
        setError(
          operationError instanceof Error
            ? operationError.message
            : "Scout could not save that change.",
        );
      } finally {
        setBusy(undefined);
      }
    },
    [getToken, reload],
  );

  return {
    assumptions,
    experiments,
    decisions,
    thesisVersions,
    timeline,
    claims,
    evidence,
    loading,
    busy,
    error,
    notice,
    reload,
    dismissNotice: () => setNotice(undefined),
    reviewAssumptionField: (id, review) =>
      run(`assumption:${id}`, async (token) => {
        await reviewAssumption(token, id, review);
        return undefined;
      }),
    buildSprint: (assumptionIds) =>
      run("sprint", async (token) => {
        if (!projectId) return undefined;
        const created = await buildValidationSprint(token, projectId, assumptionIds);
        return `Planned ${created.length} experiment${created.length === 1 ? "" : "s"}. Review the steps before you start.`;
      }),
    moveExperiment: (id, status) =>
      run(`experiment:${id}`, async (token) => {
        await updateExperiment(token, id, { status });
        return undefined;
      }),
    recordObservation: (experimentId, observation) =>
      run(`observation:${experimentId}`, async (token) => {
        await addObservation(token, experimentId, observation);
        return "Observation recorded.";
      }),
    requestReview: (experimentId) =>
      run(`review:${experimentId}`, async (token) => {
        const review = await reviewExperiment(token, experimentId);
        const next = review.recommended_next_action?.trim();
        return next
          ? `Scout reviewed the results: ${review.experiment.result}. Next: ${next}`
          : `Scout reviewed the results: ${review.experiment.result}. Confirm or reject the proposed decision below.`;
      }),
    confirm: (decisionId, changeNote) =>
      run(`decision:${decisionId}`, async (token) => {
        const decision = await confirmDecision(
          token,
          decisionId,
          changeNote ? { change_note: changeNote } : {},
        );
        const next = decision.recommended_next_action?.trim();
        const base =
          Object.keys(decision.thesis_changes).length > 0
            ? "Decision confirmed and a new thesis version was created."
            : "Decision confirmed. The thesis is unchanged.";
        return next ? `${base} Next: ${next}` : base;
      }),
    reject: (decisionId, note) =>
      run(`decision:${decisionId}`, async (token) => {
        await rejectDecision(token, decisionId, note);
        return "Decision rejected. The thesis is unchanged.";
      }),
  };
}
