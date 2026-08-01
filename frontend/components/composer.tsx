"use client";

import { ArrowRight, ChevronDown, Loader2, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  shouldExtractPastedBrief,
  STARTUP_BRIEF_MAX_LENGTH,
} from "@/lib/startup-form";
import type { StartupFormState } from "@/lib/types";

const EXAMPLES = [
  "AI copilot that closes the books for small CPA firms",
  "Marketplace matching indie game studios with freelance QA testers",
  "Compliance monitoring for early-stage fintechs",
];

const QUICK_FIELDS: {
  key: keyof StartupFormState;
  label: string;
  placeholder: string;
}[] = [
  { key: "targetCustomer", label: "Target customer", placeholder: "CPA firms, 5–20 staff" },
  { key: "geography", label: "Geography", placeholder: "United States" },
  { key: "businessModel", label: "Business model", placeholder: "B2B SaaS" },
  { key: "stage", label: "Stage", placeholder: "Idea / pre-seed" },
];

const CONTEXT_GROUPS: {
  title: string;
  fields: {
    key: keyof StartupFormState;
    label: string;
    placeholder: string;
    wide?: boolean;
  }[];
}[] = [
  {
    title: "Problem",
    fields: [
      { key: "problem", label: "Problem", placeholder: "What breaks today, and for whom?", wide: true },
      { key: "customerPain", label: "Customer pain", placeholder: "How acute is it — and how do you know?", wide: true },
      { key: "currentAlternatives", label: "Alternatives today", placeholder: "Spreadsheets, incumbents, doing nothing" },
      { key: "knownCompetitors", label: "Known competitors", placeholder: "Acme, Globex" },
    ],
  },
  {
    title: "Solution",
    fields: [
      { key: "proposedSolution", label: "Proposed solution", placeholder: "What you're building, and why it's different", wide: true },
      { key: "pricingHypothesis", label: "Pricing hypothesis", placeholder: "$49 per seat / month" },
      { key: "gtmConstraints", label: "GTM constraints", placeholder: "Budget, channels, regulation" },
    ],
  },
  {
    title: "Team and traction",
    fields: [
      { key: "traction", label: "Traction", placeholder: "Users, revenue, waitlist, LOIs" },
      { key: "teamContext", label: "Team", placeholder: "Background, unfair advantage" },
    ],
  },
];

/** Underline field that grows with its content so extracted briefs are never clipped. */
function GrowingField({
  label,
  value,
  placeholder,
  disabled,
  onChange,
  wide = false,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.max(el.scrollHeight, 22)}px`;
  }, [value]);

  return (
    <label className={cn("block min-w-0", wide && "sm:col-span-2")}>
      <span className="block text-[12px] text-muted-foreground">{label}</span>
      <textarea
        ref={ref}
        rows={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 block w-full resize-none overflow-hidden border-b border-border bg-transparent pb-1.5 text-[13px] leading-snug break-words placeholder:text-subtle-foreground focus:border-foreground focus:outline-none disabled:opacity-60"
      />
    </label>
  );
}

const IDEA_MAX_LENGTH = 2000;

const ALL_CONTEXT_KEYS = [
  ...QUICK_FIELDS.map((field) => field.key),
  ...CONTEXT_GROUPS.flatMap((group) => group.fields.map((field) => field.key)),
];

/**
 * The composer.
 *
 * One sheet: the idea, then the context that sharpens it, then the action. What
 * changed and why — the page used to open with a radial brand glow, a grid
 * backdrop, filled input boxes, pill-shaped examples and a roster of seven
 * agent chips. That is five competing surfaces before a single word is typed.
 * Now the fields are separated by hairlines inside one bordered sheet, the
 * examples are text, and the roster lives on the landing page where it belongs.
 */
export function Composer({
  form,
  onUpdate,
  onSubmit,
  isRunning,
  error,
  draftRestored = false,
  onClearDraft,
  onDismissRestored,
  onExtractBrief,
  isExtractingBrief = false,
  extractionMessage,
  extractionError,
}: {
  form: StartupFormState;
  onUpdate: <K extends keyof StartupFormState>(
    field: K,
    value: StartupFormState[K],
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isRunning: boolean;
  error?: string;
  draftRestored?: boolean;
  onClearDraft?: () => void;
  onDismissRestored?: () => void;
  onExtractBrief?: (text: string) => Promise<void>;
  isExtractingBrief?: boolean;
  extractionMessage?: string;
  extractionError?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [contextOpen, setContextOpen] = useState(false);

  const filled = ALL_CONTEXT_KEYS.filter(
    (key) => form[key].trim().length > 0,
  ).length;

  useEffect(() => {
    if (extractionMessage) setContextOpen(true);
  }, [extractionMessage]);

  function handleIdeaPaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (!onExtractBrief || isExtractingBrief) return;
    const text = event.clipboardData.getData("text/plain");
    const target = event.currentTarget;
    if (
      !shouldExtractPastedBrief(
        text,
        form.idea,
        target.selectionStart,
        target.selectionEnd,
      )
    ) {
      return;
    }

    event.preventDefault();
    const boundedText = text.trim().slice(0, STARTUP_BRIEF_MAX_LENGTH);
    // Keep the beginning of the paste in the controlled field so provider or
    // network failure never turns the user's paste into lost input.
    onUpdate("idea", boundedText.slice(0, IDEA_MAX_LENGTH));
    void onExtractBrief(boundedText);
  }

  // ⌘/Ctrl+Enter submits from inside the textarea, where plain Enter must stay
  // a newline.
  function handleIdeaKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  return (
    <div className="view-enter mx-auto w-full max-w-[46rem] px-4 py-10 pb-safe sm:px-6 sm:py-16">
      <h2 className="font-serif text-[1.75rem] leading-tight font-semibold sm:text-[2rem]">
        What are you building?
      </h2>
      <p className="mt-2 text-muted-foreground">
        One line is enough. Anything you add sharpens the research.
      </p>

      {draftRestored && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-l-2 border-border-strong pl-3">
          <p className="text-[13px] text-muted-foreground">
            Restored the draft you left here last time.
          </p>
          <div className="flex items-center gap-3 text-[13px]">
            <button
              type="button"
              onClick={onClearDraft}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Start blank
            </button>
            <button
              type="button"
              onClick={onDismissRestored}
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Keep it
            </button>
          </div>
        </div>
      )}

      <form ref={formRef} onSubmit={onSubmit} className="mt-7">
        <div className="panel overflow-hidden focus-within:border-border-strong">
          <textarea
            required
            autoFocus
            rows={4}
            maxLength={IDEA_MAX_LENGTH}
            value={form.idea}
            onChange={(event) => onUpdate("idea", event.target.value)}
            onPaste={handleIdeaPaste}
            onKeyDown={handleIdeaKeyDown}
            disabled={isExtractingBrief}
            placeholder="An AI copilot that helps small CPA firms close their books faster…"
            aria-label="Startup idea"
            className="block w-full resize-none bg-transparent px-4 py-3.5 text-[15px] leading-relaxed placeholder:text-subtle-foreground focus:outline-none"
          />

          {/* Quick context: hairline cells, not filled boxes. */}
          <div className="grid border-t border-border sm:grid-cols-2">
            {QUICK_FIELDS.map((field, index) => (
              <label
                key={field.key}
                className={cn(
                  "flex items-baseline gap-2 border-border px-4 py-2.5",
                  index % 2 === 0 && "sm:border-r",
                  index > 1 && "border-t",
                  index === 1 && "border-t sm:border-t-0",
                )}
              >
                <span className="w-[7.5rem] shrink-0 text-[12px] text-muted-foreground">
                  {field.label}
                </span>
                <input
                  value={form[field.key]}
                  disabled={isExtractingBrief}
                  onChange={(event) => onUpdate(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  className="min-w-0 flex-1 bg-transparent text-[13px] placeholder:text-subtle-foreground focus:outline-none"
                />
              </label>
            ))}
          </div>
        </div>

        <Collapsible
          className="group mt-2"
          open={contextOpen}
          onOpenChange={setContextOpen}
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              More context
              <span className="text-subtle-foreground tabular-nums">
                {filled}/{ALL_CONTEXT_KEYS.length}
              </span>
              <ChevronDown
                size={13}
                className="transition-transform group-data-[state=open]:rotate-180"
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden">
            <div className="panel mt-2.5 divide-y divide-border">
              {CONTEXT_GROUPS.map((group) => (
                <fieldset key={group.title} className="p-4">
                  <legend className="label mb-2.5">{group.title}</legend>
                  <div className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
                    {group.fields.map((field) => (
                      <GrowingField
                        key={field.key}
                        label={field.label}
                        value={form[field.key]}
                        placeholder={field.placeholder}
                        disabled={isExtractingBrief}
                        wide={field.wide}
                        onChange={(next) => onUpdate(field.key, next)}
                      />
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {isExtractingBrief && (
          <p
            role="status"
            className="mt-4 flex items-center gap-2 text-[13px] text-muted-foreground"
          >
            <Loader2 size={13} className="spin" />
            Reading your brief and filling the form…
          </p>
        )}
        {!isExtractingBrief && extractionMessage && (
          <p
            role="status"
            className="mt-4 flex items-center gap-2 text-[13px] text-foreground"
          >
            <Sparkles size={13} />
            {extractionMessage}
          </p>
        )}
        {extractionError && (
          <p role="alert" className="mt-4 text-[13px] text-destructive">
            {extractionError}
          </p>
        )}

        {error && (
          <p role="alert" className="mt-4 text-[13px] text-destructive">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] text-muted-foreground">
            Eight searches, seven specialists, one scored verdict · about two
            minutes
          </p>
          <Button
            type="submit"
            disabled={!form.idea.trim() || isRunning || isExtractingBrief}
            className="h-9 gap-1.5"
          >
            {isExtractingBrief ? (
              <>
                <Loader2 size={14} className="spin" /> Reading brief
              </>
            ) : isRunning ? (
              <>
                <Loader2 size={14} className="spin" /> Starting
              </>
            ) : (
              <>
                Start research <ArrowRight size={14} />
              </>
            )}
          </Button>
        </div>
      </form>

      <div className="mt-10 border-t border-border pt-5">
        <p className="text-[12px] text-muted-foreground">Try one of these</p>
        <ul className="mt-2 space-y-1.5">
          {EXAMPLES.map((example) => (
            <li key={example}>
              <button
                type="button"
                onClick={() => onUpdate("idea", example)}
                className="text-left text-[13px] text-foreground/75 underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                {example}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
