import Link from "next/link";
import type { ReactNode } from "react";
import { ScoutMark } from "@/components/scout-logo";
import { AGENT_LIST } from "@/lib/agent-meta";

/**
 * Split-screen frame for the Clerk flows.
 *
 * A bare centred Clerk card gave no reason to sign up. The left column carries
 * the pitch as text — no icon tiles, no glow, no gradient — and the right column
 * is the form, which is all that renders below `lg` so the credential field is
 * never pushed under the fold.
 */
export function AuthLayout({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden bg-ink-panel px-12 py-12 text-ink-panel-foreground lg:flex lg:flex-col lg:justify-between xl:px-16">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-md border border-ink-panel-foreground/20">
            <ScoutMark size={15} />
          </span>
          <span className="font-serif text-[15px] font-semibold">Scout</span>
        </Link>

        <div className="max-w-md">
          <p className="text-[11px] tracking-[0.12em] uppercase opacity-50">
            {eyebrow}
          </p>
          <h2 className="mt-5 font-serif text-[2.125rem] leading-[1.1] font-semibold">
            Eight live searches. Seven specialists. One scored verdict.
          </h2>
          <p className="mt-5 leading-relaxed opacity-65">
            Scout researches your idea against the open web, routes the evidence
            to role-specific analysts, and saves every run — so a stopped report
            resumes instead of starting over.
          </p>

          <ul className="mt-9 grid grid-cols-2 gap-x-8 gap-y-1.5">
            {AGENT_LIST.map((agent) => (
              <li key={agent.id} className="text-[13px] opacity-70">
                {agent.label}
              </li>
            ))}
          </ul>
        </div>

        <dl className="flex gap-10 border-t border-ink-panel-foreground/15 pt-6">
          {[
            { value: "8", label: "searches" },
            { value: "7", label: "specialists" },
            { value: "6", label: "dimensions" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-1.5">
              <dt className="font-serif text-xl font-semibold tabular-nums">
                {stat.value}
              </dt>
              <dd className="text-[12.5px] opacity-55">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col justify-center bg-background px-5 py-12 pt-safe pb-safe sm:px-10">
        <div className="mx-auto w-full max-w-[24rem]">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2 lg:hidden"
            aria-label="Scout home"
          >
            <span className="grid size-7 place-items-center rounded-md bg-foreground text-background">
              <ScoutMark size={15} />
            </span>
            <span className="font-serif text-[15px] font-semibold">Scout</span>
          </Link>

          <h1 className="font-serif text-[1.65rem] font-semibold">{title}</h1>
          <p className="mt-2 mb-8 text-[13.5px] leading-relaxed text-muted-foreground">
            {subtitle}
          </p>

          {children}
        </div>
      </section>
    </main>
  );
}
