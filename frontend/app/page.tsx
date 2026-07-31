import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CanvasPreview } from "@/components/landing/canvas-preview";
import { ScoutMark } from "@/components/scout-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { AGENT_LIST } from "@/lib/agent-meta";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#workspace", label: "Workspace" },
  { href: "#team", label: "Specialists" },
];

const STEPS = [
  {
    title: "Describe the idea",
    body: "One line is enough. Add customer, pricing, or stage and the research sharpens.",
  },
  {
    title: "Watch the research run",
    body: "Eight searches and seven specialists work in parallel, with every query visible.",
  },
  {
    title: "Get a recommendation",
    body: "A scored verdict with confidence — and the conditions that would change it.",
  },
  {
    title: "Leave with experiments",
    body: "Your riskiest assumptions, each paired with a cheap test that has a failure line.",
  },
];

const WORKSPACE = [
  {
    title: "A decision, not a summary",
    body: "Proceed, narrow, investigate, or reconsider — with the score, the confidence, and what would move it.",
  },
  {
    title: "The assumptions still open",
    body: "Risks and investor objections become rows you set a status on as you learn.",
  },
  {
    title: "Experiments with a failure line",
    body: "Every test states what success looks like and what would kill it.",
  },
  {
    title: "Evidence, sorted by direction",
    body: "What supports the idea, what cuts against it, and what nobody can answer yet.",
  },
  {
    title: "Every claim cited",
    body: "Deduplicated sources you can open, and the Markdown report if you want the long form.",
  },
  {
    title: "Runs that resume",
    body: "Completed stages are checkpointed, so a failed run picks up instead of starting over.",
  },
];

const LIMITS = [
  "Talk to your customers for you. Research narrows the question; only people answer it.",
  "Pretend to be certain. Every recommendation carries a confidence and the evidence behind it.",
  "Invent a number. If a claim has no source, it does not reach your canvas.",
  "Change your thesis without confirmation. Scout can recommend a move; the founder owns the decision.",
];

export default async function LandingPage() {
  const { userId } = await auth();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <nav className="mx-auto flex h-14 max-w-[68rem] items-center gap-6 px-5 sm:px-6">
          <Link href="/" aria-label="Scout home" className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-foreground text-background">
              <ScoutMark size={15} />
            </span>
            <span className="font-serif text-[15px] font-semibold">Scout</span>
          </Link>

          <div className="hidden items-center gap-5 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {userId ? (
              <>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/projects">Projects</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/app">Open Scout</Link>
                </Button>
                <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
              </>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/sign-up">Start free</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div
            aria-hidden
            className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_20%,transparent_100%)]"
          />
          <div className="mx-auto grid max-w-[68rem] items-center gap-12 px-5 pt-16 pb-14 sm:px-6 sm:pt-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16 lg:pb-20">
            <div className="max-w-xl">
              <p className="label">Multi-agent startup research</p>
              <h1 className="mt-5 font-serif text-[2.25rem] leading-[1.05] font-semibold text-balance sm:text-[3rem]">
                Find out what would kill your idea — before you build it.
              </h1>
              <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
                Scout runs seven specialist agents over live web research, then
                hands you a scored recommendation, the assumptions it could not
                settle, and the cheapest experiments that would.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild className="gap-1.5">
                  <Link href="/app">
                    Stress-test an idea <ArrowRight size={14} />
                  </Link>
                </Button>
                <Link
                  href="#workspace"
                  className="text-[13px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  See what you get
                </Link>
              </div>
              <p className="mt-6 text-[12.5px] text-subtle-foreground">
                Free account · every claim cited · projects saved
              </p>
            </div>

            <CanvasPreview />
          </div>
        </section>

        {/* Numbers */}
        <section className="border-b border-border">
          <dl className="mx-auto flex max-w-[68rem] flex-wrap gap-x-12 gap-y-6 px-5 py-8 sm:px-6">
            {[
              { value: "8", label: "live web searches" },
              { value: "7", label: "specialist agents" },
              { value: "6", label: "scored dimensions" },
              { value: "0", label: "uncited claims" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-baseline gap-2">
                <dd className="font-serif text-2xl font-semibold tabular-nums">
                  {stat.value}
                </dd>
                <dt className="text-[13px] text-muted-foreground">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </section>

        {/* Positioning */}
        <section className="mx-auto max-w-[68rem] px-5 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <p className="label">Why Scout is different</p>
            <h2 className="mt-4 font-serif text-[1.65rem] leading-tight font-semibold text-balance sm:text-[2rem]">
              Most idea validation ends in a document nobody acts on.
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              A polished report feels like progress. It is not. Scout ends where
              the work actually starts — with the questions research cannot answer
              and a plan to answer them.
            </p>
          </div>

          <div className="mt-10 grid gap-x-12 gap-y-8 lg:grid-cols-2">
            <div>
              <h3 className="border-b border-border pb-2 text-[13px] font-medium text-muted-foreground">
                What you usually get
              </h3>
              <ul className="divide-y divide-border">
                {[
                  "Twelve pages of confident prose",
                  "A market size with no source",
                  "A verdict with no conditions attached",
                  "Nothing to do on Monday morning",
                ].map((item) => (
                  <li key={item} className="py-2.5 text-[13.5px] text-muted-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="border-b border-border pb-2 text-[13px] font-medium">
                What Scout gives you
              </h3>
              <ul className="divide-y divide-border">
                {[
                  "A recommendation with a confidence level",
                  "Every claim traced to a source you can open",
                  "The exact conditions that would change the answer",
                  "Three experiments you can start this week",
                ].map((item) => (
                  <li key={item} className="py-2.5 text-[13.5px]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-y border-border bg-surface-sunken">
          <div className="mx-auto max-w-[68rem] px-5 py-16 sm:px-6 sm:py-20">
            <p className="label">How it works</p>
            <h2 className="mt-4 max-w-2xl font-serif text-[1.65rem] leading-tight font-semibold text-balance sm:text-[2rem]">
              From a single line to a week of work you can defend.
            </h2>
            <ol className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <li key={step.title} className="border-t border-border pt-4">
                  <span className="text-[12px] tabular-nums text-subtle-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-[14px] font-medium">{step.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Workspace */}
        <section id="workspace" className="mx-auto max-w-[68rem] px-5 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <p className="label">The workspace</p>
            <h2 className="mt-4 font-serif text-[1.65rem] leading-tight font-semibold text-balance sm:text-[2rem]">
              Not a document. A place to decide.
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Every finished run opens as a canvas: the recommendation, the thesis
              it rests on, what is still unproven, and how to find out.
            </p>
          </div>
          <div className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {WORKSPACE.map((feature) => (
              <article key={feature.title} className="border-t border-border pt-4">
                <h3 className="text-[14px] font-medium">{feature.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Specialists */}
        <section id="team" className="border-y border-border bg-surface-sunken">
          <div className="mx-auto max-w-[68rem] px-5 py-16 sm:px-6 sm:py-20">
            <p className="label">The specialists</p>
            <h2 className="mt-4 max-w-2xl font-serif text-[1.65rem] leading-tight font-semibold text-balance sm:text-[2rem]">
              Seven analysts, one verdict.
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
              Each agent owns one dimension, runs its own live research, and
              defends its own score. When one fails, the rest still report.
            </p>

            <dl className="mt-10 grid gap-x-10 sm:grid-cols-2">
              {AGENT_LIST.map((agent) => (
                <div
                  key={agent.id}
                  className="grid grid-cols-[10rem_minmax(0,1fr)] gap-4 border-t border-border py-3.5"
                >
                  <dt className="text-[13.5px] font-medium">{agent.label}</dt>
                  <dd className="text-[13px] leading-relaxed text-muted-foreground">
                    {agent.blurb}
                  </dd>
                </div>
              ))}
              <div className="grid grid-cols-[10rem_minmax(0,1fr)] gap-4 border-t border-border py-3.5">
                <dt className="text-[13.5px] font-medium">Synthesis</dt>
                <dd className="text-[13px] leading-relaxed text-muted-foreground">
                  Reconciles all seven into one scored recommendation — and owns
                  the disagreements.
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Limits */}
        <section className="mx-auto max-w-[68rem] px-5 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div>
              <p className="label">What Scout will not do</p>
              <h2 className="mt-4 font-serif text-[1.65rem] leading-tight font-semibold text-balance sm:text-[2rem]">
                The limits are part of the product.
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                A tool that tells you what it cannot do is easier to trust with
                the things it can.
              </p>
            </div>
            <ul className="divide-y divide-border border-t border-border">
              {LIMITS.map((limit) => {
                const [lead, ...rest] = limit.split(". ");
                return (
                  <li key={limit} className="py-3.5 text-[13.5px] leading-relaxed">
                    <span className="font-medium">{lead}.</span>{" "}
                    <span className="text-muted-foreground">{rest.join(". ")}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Close */}
        <section className="border-t border-border bg-ink-panel text-ink-panel-foreground">
          <div className="mx-auto max-w-[68rem] px-5 py-16 sm:px-6 sm:py-20">
            <div className="max-w-xl">
              <h2 className="font-serif text-[1.75rem] leading-tight font-semibold text-balance sm:text-[2.25rem]">
                Stop polishing the pitch. Test the assumption.
              </h2>
              <p className="mt-4 leading-relaxed opacity-70">
                One line about your idea is enough to start. You will leave with
                something to run this week.
              </p>
              <Button
                asChild
                className="mt-8 gap-1.5 bg-ink-panel-foreground text-ink-panel hover:bg-ink-panel-foreground/90"
              >
                <Link href="/app">
                  Stress-test an idea <ArrowRight size={14} />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[68rem] flex-col items-start justify-between gap-3 px-5 py-7 text-[12.5px] text-muted-foreground sm:flex-row sm:items-center sm:px-6">
          <span className="flex items-center gap-2">
            <ScoutMark size={13} />
            Scout
          </span>
          <span>Evidence-backed multi-agent startup research</span>
        </div>
      </footer>
    </div>
  );
}
