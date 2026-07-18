"use client";

import { AlertCircle, ChevronDown, Send, Square } from "lucide-react";
import { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StartupFormState } from "@/lib/types";

export function FounderBriefForm({
  form,
  onUpdate,
  onSubmit,
  onCancel,
  isRunning,
  error,
}: {
  form: StartupFormState;
  onUpdate: <K extends keyof StartupFormState>(
    field: K,
    value: StartupFormState[K],
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  isRunning: boolean;
  error?: string;
}) {
  return (
    <aside className="rounded-lg border border-border bg-card p-5 shadow-sm lg:sticky lg:top-[94px] lg:max-h-[calc(100vh-110px)] lg:overflow-y-auto">
      <div className="mb-4.5 border-b border-border pb-4">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[10px] font-extrabold tracking-[0.14em] text-primary">
            01
          </span>
          <h2 className="font-serif text-lg font-bold">Founder brief</h2>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Only the idea is required. More context sharpens the research.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="idea" className="text-[11px] font-bold tracking-wide">
            Startup idea{" "}
            <span className="text-[9px] font-medium uppercase text-primary">
              required
            </span>
          </Label>
          <Textarea
            id="idea"
            required
            maxLength={2000}
            rows={5}
            value={form.idea}
            onChange={(event) => onUpdate("idea", event.target.value)}
            placeholder="An AI copilot that helps small CPA firms close their books faster..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="targetCustomer" className="text-[11px] font-bold tracking-wide">
              Target customer
            </Label>
            <Input
              id="targetCustomer"
              value={form.targetCustomer}
              onChange={(event) => onUpdate("targetCustomer", event.target.value)}
              placeholder="CPA firms with 5–20 staff"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="geography" className="text-[11px] font-bold tracking-wide">
              Geography
            </Label>
            <Input
              id="geography"
              value={form.geography}
              onChange={(event) => onUpdate("geography", event.target.value)}
              placeholder="United States"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="businessModel" className="text-[11px] font-bold tracking-wide">
              Business model
            </Label>
            <Input
              id="businessModel"
              value={form.businessModel}
              onChange={(event) => onUpdate("businessModel", event.target.value)}
              placeholder="B2B SaaS"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="stage" className="text-[11px] font-bold tracking-wide">
              Stage
            </Label>
            <Input
              id="stage"
              value={form.stage}
              onChange={(event) => onUpdate("stage", event.target.value)}
              placeholder="Idea / pre-seed"
            />
          </div>
        </div>

        <details className="group border-t border-b border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-[11px] font-extrabold [&::-webkit-details-marker]:hidden">
            Add deeper founder context
            <ChevronDown
              size={15}
              className="transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="grid gap-3 pb-4">
            <div className="grid gap-1.5">
              <Label htmlFor="problem" className="text-[11px] font-bold tracking-wide">Problem</Label>
              <Textarea id="problem" rows={3} value={form.problem} onChange={(event) => onUpdate("problem", event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="customerPain" className="text-[11px] font-bold tracking-wide">Customer pain</Label>
              <Textarea id="customerPain" rows={3} value={form.customerPain} onChange={(event) => onUpdate("customerPain", event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="proposedSolution" className="text-[11px] font-bold tracking-wide">Proposed solution</Label>
              <Textarea id="proposedSolution" rows={3} value={form.proposedSolution} onChange={(event) => onUpdate("proposedSolution", event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="currentAlternatives" className="text-[11px] font-bold tracking-wide">
                Current alternatives{" "}
                <span className="text-[9px] font-medium text-muted-foreground">comma-separated</span>
              </Label>
              <Input id="currentAlternatives" value={form.currentAlternatives} onChange={(event) => onUpdate("currentAlternatives", event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="knownCompetitors" className="text-[11px] font-bold tracking-wide">
                Known competitors{" "}
                <span className="text-[9px] font-medium text-muted-foreground">comma-separated</span>
              </Label>
              <Input id="knownCompetitors" value={form.knownCompetitors} onChange={(event) => onUpdate("knownCompetitors", event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gtmConstraints" className="text-[11px] font-bold tracking-wide">GTM constraints</Label>
              <Textarea id="gtmConstraints" rows={2} value={form.gtmConstraints} onChange={(event) => onUpdate("gtmConstraints", event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pricingHypothesis" className="text-[11px] font-bold tracking-wide">Pricing hypothesis</Label>
              <Input id="pricingHypothesis" value={form.pricingHypothesis} onChange={(event) => onUpdate("pricingHypothesis", event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="traction" className="text-[11px] font-bold tracking-wide">Traction</Label>
              <Textarea id="traction" rows={2} value={form.traction} onChange={(event) => onUpdate("traction", event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="teamContext" className="text-[11px] font-bold tracking-wide">Team context</Label>
              <Textarea id="teamContext" rows={2} value={form.teamContext} onChange={(event) => onUpdate("teamContext", event.target.value)} />
            </div>
          </div>
        </details>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs leading-snug text-destructive"
          >
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={!form.idea.trim() || isRunning}
            className="flex-1 gap-2 font-extrabold"
          >
            <Send size={16} /> Run stress test
          </Button>
          {isRunning && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="gap-2 border-destructive/40 bg-destructive/5 font-extrabold text-destructive hover:bg-destructive/10"
            >
              <Square size={14} fill="currentColor" /> Stop
            </Button>
          )}
        </div>
      </form>
    </aside>
  );
}
