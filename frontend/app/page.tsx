import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import {
  ArrowRight,
  CircleHelp,
  FileText,
  FlaskConical,
  Gauge,
  Link2,
  MinusCircle,
  PenLine,
  PlusCircle,
  Radar,
  ShieldQuestion,
} from "lucide-react";
import Link from "next/link";
import { CanvasPreview } from "@/components/landing/canvas-preview";
import { SectionHeading } from "@/components/landing/section-heading";
import { ScoutLogo, ScoutMark } from "@/components/scout-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { AGENT_LIST } from "@/lib/agent-meta";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#workspace", label: "Workspace" },
  { href: "#the-team", label: "The team" },
];

const STATS = [
  { value: "8", label: "live web searches" },
  { value: "7", label: "specialist agents" },
  { value: "6", label: "scored dimensions" },
  { value: "0", label: "uncited claims" },
];

const STEPS = [
  {
    icon: PenLine,
    title: "Describe the idea",
    body: "One line is enough. Add customer, pricing, or stage and the research sharpens.",
  },
  {
    icon: Radar,
    title: "Watch the research run",
    body: "Eight searches and seven specialists work in parallel, in the open, with every query visible.",
  },
  {
    icon: Gauge,
    title: "Get a recommendation",
    body: "A scored verdict with confidence — plus what would change it, stated up front.",
  },
  {
    icon: FlaskConical,
    title: "Leave with experiments",
    body: "Your riskiest assumptions, each paired with a cheap test that has a success and failure line.",
  },
];

const WORKSPACE_FEATURES = [
  {
    icon: Gauge,
    title: "A decision, not a summary",
    body: "Proceed, narrow, investigate, or reconsider — with the score, the confidence, and the conditions that would move it.",
    span: "lg:col-span-3",
  },
  {
    icon: ShieldQuestion,
    title: "The assumptions still open",
    body: "Risks and investor objections become cards you set a status on: untested, testing, supported, contradicted.",
    span: "lg:col-span-3",
  },
  {
    icon: FlaskConical,
    title: "Experiments with a failure line",
    body: "Every test states what success looks like and what would kill it, so the result is a decision rather than a vibe.",
    span: "lg:col-span-2",
  },
  {
    icon: Link2,
    title: "Assumptions linked to tests",
    body: "Each open question points at the experiment most likely to settle it.",
    span: "lg:col-span-2",
  },
  {
    icon: FileText,
    title: "The full report, still there",
    body: "The written report stays one tab away, ready to copy or download as Markdown.",
    span: "lg:col-span-2",
  },
];

const EVIDENCE_COLUMNS = [
  {
    icon: PlusCircle,
    tone: "text-success",
    title: "Supports the idea",
    items: ["Cloud ledger adoption is accelerating", "Staffing shortages at small firms"],
  },
  {
    icon: MinusCircle,
    tone: "text-destructive",
    title: "Cuts against it",
    items: ["Accountants are liable for errors", "Sales cycles run three to six months"],
  },
  {
    icon: CircleHelp,
    tone: "text-warning",
    title: "Still unknown",
    items: ["Whether firms will trust AI on client books", "What they actually pay today"],
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
    <div className="min-h-screen">
      <header className="sticky top-4 z-30 px-4">
        <nav className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 rounded-full border border-border bg-background/80 py-2 pr-2 pl-5 shadow-sm backdrop-blur-md">
          <Link href="/" aria-label="Scout home" className="shrink-0">
            <ScoutLogo markSize={14} />
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            {userId ? (
              <>
                <Button asChild size="sm" className="rounded-full">
                  <Link href="/app">
                    Open Scout <ArrowRight size={14} />
                  </Link>
                </Button>
                <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
              </>
            ) : (
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            )}
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
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
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px]"
            style={{
              background:
                "radial-gradient(50% 55% at 50% 0%, color-mix(in oklab, var(--brand) 12%, transparent), transparent 72%)",
            }}
          />

          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-24 pb-16 sm:pt-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-14 lg:pb-24">
            <div className="max-w-xl duration-700 animate-in fade-in slide-in-from-bottom-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase backdrop-blur">
                <ScoutMark size={13} className="text-brand" />
                Multi-agent research
              </span>
              <h1 className="mt-7 font-serif text-[2.5rem] leading-[1.05] font-semibold tracking-tight text-balance sm:text-[3.5rem]">
                Find out what would{" "}
                <span className="text-brand">kill your idea</span> — before you
                build it.
              </h1>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
                Scout runs seven specialist agents over live web research, then
                hands you a scored recommendation, the assumptions it could not
                settle, and the cheapest experiments that would.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/app">
                    Stress-test an idea <ArrowRight size={16} />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="#workspace">See what you get</Link>
                </Button>
              </div>
              <p className="mt-6 font-mono text-xs tracking-tight text-muted-foreground">
                Free account · Every claim cited · Projects saved
              </p>
            </div>

            <div className="delay-150 duration-1000 animate-in fade-in slide-in-from-bottom-6">
              <CanvasPreview />
            </div>
          </div>
        </section>

        {/* Stat strip */}
        <section className="border-b border-border bg-secondary/40">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-border px-6 sm:grid-cols-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="bg-background px-4 py-7 text-center sm:py-8"
              >
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block font-serif text-3xl font-semibold tabular-nums">
                    {stat.value}
                  </span>
                  <span className="mt-1.5 block text-[12px] tracking-wide text-muted-foreground">
                    {stat.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* The shift: report vs canvas */}
        <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <SectionHeading
            eyebrow="Why Scout is different"
            title="Most idea validation ends in a document nobody acts on."
            body="A polished report feels like progress. It is not. Scout ends where the work actually starts — with the questions research cannot answer and a plan to answer them."
          />
          <div className="mt-12 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <span className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                What you usually get
              </span>
              <ul className="mt-5 space-y-3.5">
                {[
                  "Twelve pages of confident prose",
                  "A market size with no source",
                  "A verdict with no conditions attached",
                  "Nothing to do on Monday morning",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-[14px] leading-relaxed">
                    <MinusCircle
                      size={15}
                      className="mt-0.5 shrink-0 text-muted-foreground/50"
                    />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-brand/30 bg-brand-muted/40 p-6">
              <span className="font-mono text-[11px] tracking-[0.12em] text-brand uppercase">
                What Scout gives you
              </span>
              <ul className="mt-5 space-y-3.5">
                {[
                  "A recommendation with a confidence level",
                  "Every claim traced to a source you can open",
                  "The exact conditions that would change the answer",
                  "Three experiments you can start this week",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-[14px] leading-relaxed">
                    <PlusCircle size={15} className="mt-0.5 shrink-0 text-brand" />
                    <span className="text-foreground/85">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-y border-border bg-secondary/40">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <SectionHeading
              eyebrow="How it works"
              title="From a single line to a week of work you can defend."
            />
            <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex flex-col bg-card p-6">
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-md bg-foreground/[0.05] text-foreground dark:bg-foreground/10">
                      <step.icon size={18} strokeWidth={1.75} />
                    </span>
                    <span className="font-mono text-sm text-muted-foreground/60">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-serif text-[17px] font-semibold">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Workspace anatomy */}
        <section id="workspace" className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <SectionHeading
            eyebrow="The workspace"
            title="Not a document. A place to decide."
            body="Every finished run opens as a canvas: the recommendation, the thesis it rests on, what is still unproven, and how to find out."
          />
          <div className="mt-12 grid gap-4 lg:grid-cols-6">
            {WORKSPACE_FEATURES.map((feature) => (
              <article
                key={feature.title}
                className={`group rounded-xl border border-border bg-card p-6 transition-colors hover:border-brand/40 ${feature.span}`}
              >
                <span className="grid h-10 w-10 place-items-center rounded-md bg-foreground/[0.05] text-foreground transition-colors group-hover:bg-brand-muted group-hover:text-brand dark:bg-foreground/10">
                  <feature.icon size={18} strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 font-serif text-[17px] font-semibold">
                  {feature.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
              </article>
            ))}
          </div>

          {/* Evidence board illustration */}
          <div className="mt-4 rounded-xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <span className="text-[10px] font-semibold tracking-[0.16em] text-brand uppercase">
                  Evidence board
                </span>
                <h3 className="mt-1 font-serif text-[17px] font-semibold">
                  Sorted by which way it cuts
                </h3>
              </div>
              <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">
                Including the honest gaps. Scout shows you what it could not
                answer instead of writing around it.
              </p>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {EVIDENCE_COLUMNS.map((column) => (
                <div
                  key={column.title}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <h4
                    className={`flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] uppercase ${column.tone}`}
                  >
                    <column.icon size={13} />
                    {column.title}
                  </h4>
                  <ul className="mt-3 space-y-2">
                    {column.items.map((item) => (
                      <li
                        key={item}
                        className="text-[12.5px] leading-relaxed text-foreground/75"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The team */}
        <section
          id="the-team"
          className="border-y border-border bg-secondary/40"
        >
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <SectionHeading
              eyebrow="The team"
              title="Seven specialists, one verdict."
              body="Each agent owns one dimension, runs its own live research, and defends its own score. When one fails, the rest still report."
            />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {AGENT_LIST.map((agent) => (
                <div
                  key={agent.id}
                  className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-brand/40"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-foreground/[0.05] text-foreground transition-colors group-hover:bg-brand-muted group-hover:text-brand dark:bg-foreground/10">
                    <agent.icon size={18} strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-4 font-serif text-[15px] font-semibold">
                    {agent.label}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {agent.blurb}
                  </p>
                </div>
              ))}
              <div className="rounded-xl border border-dashed border-border bg-transparent p-5">
                <span className="grid h-10 w-10 place-items-center rounded-md border border-border text-brand">
                  <ScoutMark size={17} />
                </span>
                <h3 className="mt-4 font-serif text-[15px] font-semibold">
                  Synthesis
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  Reconciles all seven into one scored recommendation — and owns
                  the disagreements.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Honest limits */}
        <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
            <SectionHeading
              eyebrow="What Scout will not do"
              title="The limits are part of the product."
              body="A tool that tells you what it cannot do is easier to trust with the things it can."
              className="max-w-none"
            />
            <ul className="space-y-px overflow-hidden rounded-xl border border-border bg-border">
              {LIMITS.map((limit) => {
                const [lead, ...rest] = limit.split(". ");
                return (
                  <li key={limit} className="bg-card px-5 py-4">
                    <p className="text-[14px] leading-relaxed">
                      <span className="font-medium text-foreground">
                        {lead}.
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {rest.join(". ")}
                      </span>
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* CTA band */}
        <section className="relative overflow-hidden border-t border-border bg-foreground text-background">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage:
                "radial-gradient(ellipse 70% 70% at 50% 50%, #000 20%, transparent 100%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 70% 70% at 50% 50%, #000 20%, transparent 100%)",
            }}
          />
          <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-24">
            <ScoutMark size={28} className="mx-auto text-brand" />
            <h2 className="mx-auto mt-6 max-w-2xl font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Stop polishing the pitch. Test the assumption.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-background/70">
              One line about your idea is enough to start. You will leave with
              something to run this week.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-9 gap-2 bg-background text-foreground hover:bg-background/90"
            >
              <Link href="/app">
                Stress-test an idea <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <ScoutLogo markSize={12} textClassName="text-base text-foreground" />
          <span className="font-mono text-xs">
            Evidence-backed multi-agent startup research
          </span>
        </div>
      </footer>
    </div>
  );
}
