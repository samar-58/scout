import { Clock, FlaskConical, Target, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A faithful miniature of the real workspace: the decision, the assumptions
 * still open, and one experiment that would close them. It uses the same tokens
 * and card language as `components/canvas/*` so the landing page promises
 * exactly what the app delivers — no invented UI.
 */

const DIMENSIONS = [
  { label: "Market", value: 7, tone: "bg-success" },
  { label: "Timing", value: 8, tone: "bg-success" },
  { label: "Competition", value: 4, tone: "bg-warning" },
  { label: "Distribution", value: 3, tone: "bg-destructive" },
];

const ASSUMPTIONS = [
  {
    kind: "Risk",
    title: "Accountants will not trust AI with client books",
    status: "untested",
    tone: "border-border bg-muted text-muted-foreground",
  },
  {
    kind: "Risk",
    title: "Founder outbound can reach CPA firms economically",
    status: "testing",
    tone: "border-brand/30 bg-brand-muted text-brand",
  },
  {
    kind: "Objection",
    title: "What stops the incumbent from bundling this?",
    status: "contradicted",
    tone: "border-destructive/30 bg-destructive/10 text-destructive",
  },
];

export function CanvasPreview() {
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-card text-left shadow-xl shadow-foreground/[0.07]">
      {/* Window chrome — grounds the mock as product UI, not a graphic. */}
      <div className="flex items-center gap-3 border-b border-border bg-secondary/60 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
        </span>
        <div className="flex gap-4 text-[11px] font-medium">
          <span className="border-b-2 border-foreground pb-0.5 text-foreground">
            Workspace
          </span>
          <span className="pb-0.5 text-muted-foreground">Full report</span>
        </div>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        {/* Decision */}
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="h-1 w-full bg-brand" aria-hidden="true" />
          <div className="p-3.5">
            <span className="text-[9px] font-semibold tracking-[0.16em] text-brand uppercase">
              Scout recommendation
            </span>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <strong className="font-serif text-lg font-semibold tracking-tight">
                Narrow the focus
              </strong>
              <span className="rounded-full border border-brand/30 bg-brand-muted px-2 py-0.5 text-[9px] font-semibold tracking-[0.1em] text-brand uppercase">
                58/100
              </span>
              <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[9px] text-muted-foreground">
                62% confidence
              </span>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-foreground/70">
              The pain is real and the timing is good, but distribution is the
              binding constraint. Narrow to firms already on cloud ledgers.
            </p>

            <dl className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-2 sm:gap-x-6">
              {DIMENSIONS.map((dimension) => (
                <div
                  key={dimension.label}
                  className="grid grid-cols-[74px_1fr_26px] items-center gap-2"
                >
                  <dt className="text-[11px] font-medium text-foreground/75">
                    {dimension.label}
                  </dt>
                  <dd className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <span
                      className={cn("block h-full rounded-full", dimension.tone)}
                      style={{ width: `${dimension.value * 10}%` }}
                    />
                  </dd>
                  <dd className="text-right font-mono text-[10px] tabular-nums text-muted-foreground">
                    {dimension.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Assumptions */}
        <div className="rounded-lg border border-border p-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[9px] font-semibold tracking-[0.16em] text-brand uppercase">
              Riskiest assumptions
            </span>
            <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[9px] text-muted-foreground">
              1 untested
            </span>
          </div>
          <ul className="mt-2.5 space-y-1.5">
            {ASSUMPTIONS.map((assumption) => (
              <li
                key={assumption.title}
                className="flex items-start justify-between gap-3 rounded-md border border-border bg-background px-2.5 py-2"
              >
                <div className="min-w-0">
                  <span className="font-mono text-[9px] tracking-wide text-brand uppercase">
                    {assumption.kind}
                  </span>
                  <p className="text-[11.5px] leading-snug font-medium text-foreground">
                    {assumption.title}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-[8.5px] tracking-wide uppercase",
                    assumption.tone,
                  )}
                >
                  {assumption.status}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Linked experiment */}
        <div className="rounded-lg border border-brand/40 bg-brand-muted/40 p-3.5">
          <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold tracking-[0.16em] text-brand uppercase">
            <FlaskConical size={11} />
            Experiment 01
          </span>
          <p className="mt-1.5 text-[12.5px] font-medium text-foreground">
            Trust interview sprint
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-foreground/70">
            10 interviews with firm partners on human-in-the-loop review.
          </p>
          <dl className="mt-2.5 space-y-1">
            <div className="flex items-start gap-1.5">
              <Target size={11} className="mt-[3px] shrink-0 text-success" />
              <dd className="text-[11.5px] leading-snug text-foreground/80">
                <span className="font-medium text-foreground">Success: </span>6
                of 10 accept a review step
              </dd>
            </div>
            <div className="flex items-start gap-1.5">
              <XCircle size={11} className="mt-[3px] shrink-0 text-destructive" />
              <dd className="text-[11.5px] leading-snug text-foreground/80">
                <span className="font-medium text-foreground">Failure: </span>
                fewer than 3 accept
              </dd>
            </div>
          </dl>
          <p className="mt-2.5 inline-flex items-center gap-1.5 border-t border-brand/20 pt-2 font-mono text-[10px] text-muted-foreground">
            <Clock size={10} />1 week · $0
          </p>
        </div>
      </div>
      <figcaption className="sr-only">
        Preview of the Scout workspace showing a recommendation, score
        breakdown, open assumptions, and a linked validation experiment.
      </figcaption>
    </figure>
  );
}
