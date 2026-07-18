import { ArrowRight, FileText, PenLine, Radar } from "lucide-react";
import Link from "next/link";
import { ScoutLogo, ScoutMark } from "@/components/scout-logo";
import { Button } from "@/components/ui/button";
import { AGENT_LIST } from "@/lib/agent-meta";
import { cn } from "@/lib/utils";

const PREVIEW_DIMENSIONS = [
  { label: "Market", value: 8, tone: "bg-success" },
  { label: "Competition", value: 7, tone: "bg-success" },
  { label: "Distribution", value: 6, tone: "bg-warning" },
  { label: "Timing", value: 9, tone: "bg-success" },
];

const STEPS = [
  {
    icon: PenLine,
    title: "Describe your idea",
    body: "Share the idea and any context you have. A single line is enough to begin.",
  },
  {
    icon: Radar,
    title: "Agents research in parallel",
    body: "Seven specialists run live web research across every angle of the idea.",
  },
  {
    icon: FileText,
    title: "Read an evidence-backed report",
    body: "A scored, cited verdict you can read, copy, and share in minutes.",
  },
];

function HeroPreview() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-left shadow-xl shadow-foreground/[0.06] sm:p-6">
      <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <span className="text-[10px] font-semibold tracking-[0.16em] text-brand uppercase">
            Scout verdict
          </span>
          <p className="font-serif text-sm font-semibold sm:text-base">
            Strong · scored across six dimensions
          </p>
        </div>
        <div className="flex shrink-0 items-baseline">
          <span className="font-serif text-3xl font-semibold tabular-nums">78</span>
          <span className="ml-1 font-mono text-[11px] text-muted-foreground">
            /100
          </span>
        </div>
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 sm:gap-x-8">
        {PREVIEW_DIMENSIONS.map((dimension) => (
          <div
            key={dimension.label}
            className="grid grid-cols-[92px_1fr_30px] items-center gap-3"
          >
            <span className="text-[12px] font-medium text-foreground/80">
              {dimension.label}
            </span>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", dimension.tone)}
                style={{ width: `${dimension.value * 10}%` }}
              />
            </div>
            <span className="text-right font-mono text-[11px] tabular-nums text-muted-foreground">
              {dimension.value}/10
            </span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-2.5 border-t border-border pt-4">
        <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          Researched by
        </span>
        <div className="flex -space-x-1.5">
          {AGENT_LIST.map((agent) => (
            <span
              key={agent.id}
              title={agent.label}
              className="grid h-6 w-6 place-items-center rounded-full border border-card bg-foreground/[0.05] text-foreground dark:bg-foreground/10"
            >
              <agent.icon size={12} strokeWidth={1.75} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-4 z-20 px-4">
        <nav className="mx-auto flex h-14 max-w-md items-center justify-between gap-4 rounded-full border border-border bg-background/80 py-2 pr-2 pl-5 shadow-sm backdrop-blur-md">
          <Link href="/" aria-label="Scout home">
            <ScoutLogo markSize={14} />
          </Link>
          <Button asChild size="sm" className="rounded-full">
            <Link href="/app">
              Open Scout <ArrowRight size={14} />
            </Link>
          </Button>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          {/* Faded grid backdrop */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              backgroundImage:
                "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage:
                "radial-gradient(ellipse 80% 55% at 50% 0%, #000 30%, transparent 100%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 80% 55% at 50% 0%, #000 30%, transparent 100%)",
            }}
          />
          {/* Warm brand glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[440px]"
            style={{
              background:
                "radial-gradient(50% 55% at 50% 0%, color-mix(in oklab, var(--brand) 11%, transparent), transparent 72%)",
            }}
          />
          <div className="mx-auto max-w-5xl px-6 pt-24 pb-20 sm:pt-28 sm:pb-24">
            <div className="mx-auto max-w-3xl text-center duration-700 animate-in fade-in slide-in-from-bottom-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase backdrop-blur">
                <ScoutMark size={13} className="text-brand" />
                Multi-agent research
              </span>
              <h1 className="mt-7 font-serif text-4xl leading-[1.04] font-semibold tracking-tight text-balance sm:text-[3.75rem]">
                A team of AI analysts for your{" "}
                <span className="text-brand">startup idea.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Scout sends seven specialist agents to research your market,
                competitors, customers, and moat — then hands you a scored,
                evidence-backed verdict in minutes.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/app">
                    Start researching <ArrowRight size={16} />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="#how-it-works">See how it works</Link>
                </Button>
              </div>
              <p className="mt-6 font-mono text-xs tracking-tight text-muted-foreground">
                No signup · Every claim cited · Free to run
              </p>
            </div>

            {/* Product preview */}
            <div className="mx-auto mt-16 max-w-2xl delay-150 duration-1000 animate-in fade-in slide-in-from-bottom-6">
              <HeroPreview />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="bg-secondary/40">
          <div className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
            <div className="max-w-2xl">
              <span className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
                How it works
              </span>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight">
                From raw idea to decision-grade report.
              </h2>
            </div>
            <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="bg-card p-7">
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-md bg-foreground/[0.05] text-foreground dark:bg-foreground/10">
                      <step.icon size={18} strokeWidth={1.75} />
                    </span>
                    <span className="font-mono text-sm text-muted-foreground/70">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-serif text-lg font-semibold">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Meet the specialists */}
        <section id="the-team" className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
          <div className="max-w-2xl">
            <span className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
              The team
            </span>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight">
              Seven specialists, one verdict.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Each agent owns one dimension of the analysis, runs its own live
              research, and defends its own score.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AGENT_LIST.map((agent) => (
              <div
                key={agent.id}
                className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/25"
              >
                <span className="grid h-10 w-10 place-items-center rounded-md bg-foreground/[0.05] text-foreground dark:bg-foreground/10">
                  <agent.icon size={18} strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 font-serif text-base font-semibold">
                  {agent.label}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {agent.blurb}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className="border-t border-border bg-foreground text-background">
          <div className="mx-auto max-w-5xl px-6 py-20 text-center sm:py-24">
            <ScoutMark size={28} className="mx-auto text-brand" />
            <h2 className="mx-auto mt-6 max-w-2xl font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Put your idea in front of the team.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-background/70">
              Get an honest, cited read on whether it holds up — before you build.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-9 gap-2 bg-background text-foreground hover:bg-background/90"
            >
              <Link href="/app">
                Start researching <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <ScoutLogo
            markSize={12}
            textClassName="text-base text-foreground"
          />
          <span className="font-mono text-xs">
            Evidence-backed multi-agent startup research
          </span>
        </div>
      </footer>
    </div>
  );
}
