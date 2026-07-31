import { cn } from "@/lib/utils";

/**
 * A faithful miniature of the real workspace: the decision, the score
 * breakdown, and the assumptions still open. It uses the same tokens and the
 * same restraint as `components/canvas/*`, so the landing page promises exactly
 * what the app delivers — including the monochrome data treatment.
 */

const DIMENSIONS = [
  { label: "Market", value: 7 },
  { label: "Timing", value: 8 },
  { label: "Competition", value: 4 },
  { label: "Distribution", value: 3 },
];

const ASSUMPTIONS = [
  { title: "Accountants will not trust AI with client books", status: "Untested", dot: "bg-border-strong" },
  { title: "Founder outbound can reach CPA firms economically", status: "Testing", dot: "bg-brand" },
  { title: "What stops the incumbent from bundling this?", status: "Contradicted", dot: "bg-destructive" },
];

export function CanvasPreview() {
  return (
    <figure className="panel overflow-hidden text-left">
      <div className="flex items-center gap-4 border-b border-border px-4 py-2.5">
        <span className="text-[12px] font-medium">Accounting close copilot</span>
        <span className="ml-auto text-[11.5px] text-muted-foreground">
          v2 · 8 sources
        </span>
      </div>

      <div className="p-5">
        <p className="label">Recommendation</p>
        <div className="mt-1.5 flex items-baseline gap-2.5">
          <strong className="font-serif text-[1.35rem] font-semibold">
            Narrow the focus
          </strong>
          <span className="text-[13px] tabular-nums text-muted-foreground">
            58/100 · 62% confidence
          </span>
        </div>
        <p className="mt-2.5 text-[13px] leading-relaxed text-foreground/75">
          The pain is real and the timing is good, but distribution is the binding
          constraint. Narrow to firms already on cloud ledgers.
        </p>

        <dl className="mt-5 grid gap-x-8 gap-y-2 border-t border-border pt-4 sm:grid-cols-2">
          {DIMENSIONS.map((dimension) => (
            <div
              key={dimension.label}
              className="grid grid-cols-[5.5rem_minmax(0,1fr)_1.25rem] items-center gap-2.5"
            >
              <dt className="text-[12.5px] text-muted-foreground">
                {dimension.label}
              </dt>
              <dd className="h-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-foreground/70"
                  style={{ width: `${dimension.value * 10}%` }}
                />
              </dd>
              <dd className="text-right text-[12px] tabular-nums text-muted-foreground">
                {dimension.value}
              </dd>
            </div>
          ))}
        </dl>

        <p className="label mt-6">Assumptions</p>
        <ul className="mt-1.5 divide-y divide-border border-t border-border">
          {ASSUMPTIONS.map((assumption) => (
            <li
              key={assumption.title}
              className="flex items-baseline gap-2.5 py-2.5"
            >
              <span
                aria-hidden
                className={cn("size-1.5 shrink-0 rounded-full", assumption.dot)}
              />
              <span className="min-w-0 flex-1 text-[12.5px] leading-snug">
                {assumption.title}
              </span>
              <span className="shrink-0 text-[11.5px] text-muted-foreground">
                {assumption.status}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <figcaption className="sr-only">
        Preview of the Scout workspace showing a recommendation, score breakdown,
        and open assumptions.
      </figcaption>
    </figure>
  );
}
