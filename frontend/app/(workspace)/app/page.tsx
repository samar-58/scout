"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Composer } from "@/components/composer";
import { useProjects } from "@/components/shell/projects-store";
import { ViewHeader } from "@/components/shell/view-header";
import { useComposerDraft } from "@/hooks/use-composer-draft";
import { createProject, dispatchRun } from "@/lib/scout-api";
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
  const { form, update, clearDraft, draftRestored, dismissRestoredNotice } =
    useComposerDraft();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = toPayload(form);
    if (!payload.idea || submitting) return;

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
      />
    </>
  );
}
