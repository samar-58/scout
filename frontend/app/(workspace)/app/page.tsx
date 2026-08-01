"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Composer } from "@/components/composer";
import { useProjects } from "@/components/shell/projects-store";
import { ViewHeader } from "@/components/shell/view-header";
import { useComposerDraft } from "@/hooks/use-composer-draft";
import { createProject, dispatchRun, extractStartupBrief } from "@/lib/scout-api";
import { readablePrompt, toPayload } from "@/lib/startup-form";

/**
 * The composer, and nothing else.
 *
 * Starting a run used to keep the user on `/app` while the run streamed into a
 * page with no address of its own — reloading lost the view, and the run's own
 * project page showed an empty state for the same run. Now this route creates the
 * project, dispatches the run, and navigates to `/projects/{id}`, which is where
 * a run lives from that point on.
 */
export default function ResearchPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { refresh } = useProjects();
  const {
    form,
    update,
    applyExtracted,
    clearDraft,
    draftRestored,
    dismissRestoredNotice,
  } = useComposerDraft();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [extracting, setExtracting] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState<string>();
  const [extractionError, setExtractionError] = useState<string>();

  /**
   * A pasted brief is worth more than a pasted sentence: extract the fourteen
   * composer fields from it, but only fill the ones the founder left blank so a
   * long paste can never overwrite what they typed deliberately.
   */
  async function handleExtractBrief(text: string) {
    setExtracting(true);
    setExtractionMessage(undefined);
    setExtractionError(undefined);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session has expired. Please sign in again.");
      const extracted = await extractStartupBrief(token, text);
      applyExtracted(extracted);
      const filled = Object.values(extracted).filter(Boolean).length;
      setExtractionMessage(
        `Filled ${filled} field${filled === 1 ? "" : "s"} from your brief. Review them before starting research.`,
      );
    } catch (extractionFailure) {
      setExtractionError(
        extractionFailure instanceof Error
          ? extractionFailure.message
          : "Scout could not read that brief. The pasted text is still here to edit.",
      );
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = toPayload(form);
    if (!payload.idea || submitting || extracting) return;

    setSubmitting(true);
    setError(undefined);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session has expired. Please sign in again.");

      const project = await createProject(token, payload);
      await dispatchRun(token, project.id, payload, readablePrompt(payload));

      // The sidebar owns the project list, and the new project belongs at the
      // top of it before the destination renders.
      void refresh();
      clearDraft();
      router.push(`/projects/${project.id}`);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Could not start the research run.",
      );
      setSubmitting(false);
    }
  }

  return (
    <>
      <ViewHeader title="New research" />
      <Composer
        form={form}
        onUpdate={update}
        onSubmit={handleSubmit}
        isRunning={submitting}
        error={error}
        draftRestored={draftRestored}
        onClearDraft={clearDraft}
        onDismissRestored={dismissRestoredNotice}
        onExtractBrief={handleExtractBrief}
        isExtractingBrief={extracting}
        extractionMessage={extractionMessage}
        extractionError={extractionError}
      />
    </>
  );
}
