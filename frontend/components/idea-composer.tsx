"use client";

import { AlertCircle, ArrowRight, ChevronDown, Loader2 } from "lucide-react";
import { FormEvent } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AGENT_LIST } from "@/lib/agent-meta";
import { cn } from "@/lib/utils";
import type { StartupFormState } from "@/lib/types";

const EXAMPLES = [
  "An AI copilot that helps small CPA firms close their books faster.",
  "A marketplace connecting indie game studios with freelance QA testers.",
  "Automated compliance monitoring for early-stage fintech startups.",
];

const PRIMARY_FIELDS: {
  key: keyof StartupFormState;
  label: string;
  placeholder: string;
}[] = [
  { key: "targetCustomer", label: "Target customer", placeholder: "CPA firms with 5–20 staff" },
  { key: "geography", label: "Geography", placeholder: "United States" },
  { key: "businessModel", label: "Business model", placeholder: "B2B SaaS" },
  { key: "stage", label: "Stage", placeholder: "Idea / pre-seed" },
];

const ADVANCED_GROUPS: {
  title: string;
  fields: {
    key: keyof StartupFormState;
    label: string;
    placeholder: string;
    hint?: string;
    textarea?: boolean;
  }[];
}[] = [
  {
    title: "The problem",
    fields: [
      {
        key: "problem",
        label: "Problem",
        placeholder: "What breaks today, and for whom?",
        textarea: true,
      },
      {
        key: "customerPain",
        label: "Customer pain",
        placeholder: "How acute is it — and how do you know?",
        textarea: true,
      },
      {
        key: "currentAlternatives",
        label: "Current alternatives",
        placeholder: "Spreadsheets, incumbent tools, doing nothing…",
        hint: "comma-separated",
      },
    ],
  },
  {
    title: "Your solution",
    fields: [
      {
        key: "proposedSolution",
        label: "Proposed solution",
        placeholder: "What you're building and why it's different",
        textarea: true,
      },
      {
        key: "knownCompetitors",
        label: "Known competitors",
        placeholder: "Acme, Globex, Initech…",
        hint: "comma-separated",
      },
      {
        key: "pricingHypothesis",
        label: "Pricing hypothesis",
        placeholder: "e.g. $49 / seat / month",
      },
    ],
  },
  {
    title: "Traction & team",
    fields: [
      {
        key: "gtmConstraints",
        label: "GTM constraints",
        placeholder: "Budget, channels, regulatory limits…",
        textarea: true,
      },
      {
        key: "traction",
        label: "Traction",
        placeholder: "Users, revenue, waitlist, LOIs…",
        textarea: true,
      },
      {
        key: "teamContext",
        label: "Team context",
        placeholder: "Founder background, unfair advantage…",
        textarea: true,
      },
    ],
  },
];

export function IdeaComposer({
  form,
  onUpdate,
  onSubmit,
  isRunning,
  error,
}: {
  form: StartupFormState;
  onUpdate: <K extends keyof StartupFormState>(
    field: K,
    value: StartupFormState[K],
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isRunning: boolean;
  error?: string;
}) {
  return (
    <div className="relative overflow-hidden">
      {/* Faded grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 65% 55% at 50% 22%, #000 15%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 65% 55% at 50% 22%, #000 15%, transparent 80%)",
        }}
      />
      {/* Warm brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[380px]"
        style={{
          background:
            "radial-gradient(45% 50% at 50% 0%, color-mix(in oklab, var(--brand) 9%, transparent), transparent 72%)",
        }}
      />
      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-2xl flex-col justify-center px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] duration-500 animate-in fade-in slide-in-from-bottom-3 sm:px-6 sm:py-16">
      <div className="text-center">
        <span className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
          New research run
        </span>
        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          What are you building?
        </h1>
        <p className="mt-3 text-muted-foreground">
          Describe your idea. Seven specialist agents will research it live and
          return an evidence-backed verdict.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-8">
        <div className="rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:border-foreground/40">
          <Textarea
            required
            autoFocus
            maxLength={2000}
            rows={4}
            value={form.idea}
            onChange={(event) => onUpdate("idea", event.target.value)}
            placeholder="An AI copilot that helps small CPA firms close their books faster…"
            className="resize-none border-0 bg-transparent px-3 py-2.5 text-base shadow-none focus-visible:ring-0"
          />
          <div className="grid grid-cols-2 gap-2 px-1 pt-1 sm:grid-cols-4">
            {PRIMARY_FIELDS.map((field) => (
              <Input
                key={field.key}
                value={form[field.key]}
                onChange={(event) => onUpdate(field.key, event.target.value)}
                placeholder={field.label}
                aria-label={field.label}
                className="h-10 border-border/70 bg-muted/40 text-base sm:h-9 sm:text-xs"
              />
            ))}
          </div>
        </div>

        <Collapsible className="group mt-3">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Add deeper founder context
              <ChevronDown
                size={14}
                className="transition-transform group-data-[state=open]:rotate-180"
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden rounded-xl border border-border bg-card px-5 duration-300 animate-in fade-in slide-in-from-top-1">
            <p className="border-b border-border py-3 text-[11px] leading-relaxed text-muted-foreground">
              All optional — the more you share, the sharper the analysis. Leave
              anything you're unsure about blank.
            </p>
            <div className="divide-y divide-border">
              {ADVANCED_GROUPS.map((group) => (
                <div key={group.title} className="space-y-3 py-5">
                  <p className="text-[10px] font-semibold tracking-[0.16em] text-brand uppercase">
                    {group.title}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {group.fields.map((field) => (
                      <div
                        key={field.key}
                        className={cn("grid gap-1.5", field.textarea && "sm:col-span-2")}
                      >
                        <Label
                          htmlFor={field.key}
                          className="flex items-center gap-1.5 text-xs font-medium text-foreground"
                        >
                          {field.label}
                          {field.hint && (
                            <span className="font-normal text-muted-foreground">
                              · {field.hint}
                            </span>
                          )}
                        </Label>
                        {field.textarea ? (
                          <Textarea
                            id={field.key}
                            rows={2}
                            placeholder={field.placeholder}
                            value={form[field.key]}
                            onChange={(event) => onUpdate(field.key, event.target.value)}
                            className="resize-none border-border/70 bg-muted/40 text-base sm:text-sm"
                          />
                        ) : (
                          <Input
                            id={field.key}
                            placeholder={field.placeholder}
                            value={form[field.key]}
                            onChange={(event) => onUpdate(field.key, event.target.value)}
                            className="h-10 border-border/70 bg-muted/40 text-base sm:h-9 sm:text-sm"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {error && (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs leading-snug text-destructive"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={!form.idea.trim() || isRunning}
          className="mt-4 w-full gap-2"
        >
          {isRunning ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Starting research…
            </>
          ) : (
            <>
              Start research <ArrowRight size={16} />
            </>
          )}
        </Button>
      </form>

      <div className="mt-8">
        <p className="text-center text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Try an example
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onUpdate("idea", example)}
              className="max-w-full truncate rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground active:bg-muted"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-center text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Your idea will be researched by
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {AGENT_LIST.map((agent) => (
              <span
                key={agent.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
              >
                <agent.icon
                  size={13}
                  strokeWidth={1.75}
                  className="text-foreground/70"
                />
                {agent.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
