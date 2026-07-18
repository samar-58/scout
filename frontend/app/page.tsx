"use client";

import { FormEvent, useState } from "react";
import { AgentTimeline } from "@/components/agent-timeline";
import { FounderBriefForm } from "@/components/founder-brief-form";
import { ReportPanel } from "@/components/report-panel";
import { SearchActivityPanel } from "@/components/search-activity-panel";
import { StatusBar } from "@/components/status-bar";
import { useStartupStream } from "@/hooks/use-startup-stream";
import { initialFormState, readablePrompt, toPayload } from "@/lib/startup-form";
import type { StartupFormState } from "@/lib/types";

export default function Home() {
  const [form, setForm] = useState<StartupFormState>(initialFormState);
  const {
    agents,
    searches,
    sources,
    score,
    markdown,
    isRunning,
    displayStatus,
    error,
    submit,
    cancelRun,
  } = useStartupStream();

  function update<K extends keyof StartupFormState>(
    field: K,
    value: StartupFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = toPayload(form);
    if (!payload.idea || isRunning) return;
    await submit(readablePrompt(payload), { startup: payload });
  }

  return (
    <main className="min-h-screen">
      <StatusBar displayStatus={displayStatus} isRunning={isRunning} />

      <div className="mx-auto grid w-full max-w-[1580px] items-start gap-4 p-4 lg:grid-cols-[390px_minmax(0,1fr)]">
        <FounderBriefForm
          form={form}
          onUpdate={update}
          onSubmit={handleSubmit}
          onCancel={cancelRun}
          isRunning={isRunning}
          error={error}
        />

        <section className="grid min-w-0 gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <AgentTimeline agents={agents} />
            <SearchActivityPanel searches={searches} />
          </div>

          <ReportPanel markdown={markdown} score={score} sources={sources} />
        </section>
      </div>
    </main>
  );
}
