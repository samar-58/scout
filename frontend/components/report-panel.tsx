"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { isValidElement, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ReportTableOfContents } from "@/components/report-table-of-contents";
import { ReportToolbar } from "@/components/report-toolbar";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { ScoutMark } from "@/components/scout-logo";
import { extractHeadings, slugify } from "@/lib/markdown-headings";
import type { ScoreEvent, Source } from "@/lib/types";

/**
 * Recursively flatten a React node tree to its plain text. react-markdown
 * passes heading `children` as nodes (strings, arrays, and elements), so a
 * naive `String(children)` yields "[object Object]" and breaks slug matching.
 */
function nodeToText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (isValidElement(node)) {
    return nodeToText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

function useHeadingComponents(): Components {
  const seen = useRef(new Map<string, number>());
  seen.current.clear();

  function makeHeading(Tag: "h1" | "h2" | "h3") {
    return ({ children }: { children?: React.ReactNode }) => {
      const text = nodeToText(children);
      const base = slugify(text);
      const count = seen.current.get(base) ?? 0;
      seen.current.set(base, count + 1);
      const id = count === 0 ? base : `${base}-${count}`;
      return <Tag id={id}>{children}</Tag>;
    };
  }

  return {
    h1: makeHeading("h1"),
    h2: makeHeading("h2"),
    h3: makeHeading("h3"),
  };
}

const PROSE_CLASSES = [
  "prose prose-neutral dark:prose-invert mx-auto max-w-2xl",
  "text-[15px] leading-[1.75] [overflow-wrap:anywhere]",
  // Serif display headings, sans body — editorial reading experience.
  "prose-headings:font-serif prose-headings:font-semibold prose-headings:tracking-tight prose-headings:scroll-mt-24",
  "prose-h1:text-[1.6rem] sm:prose-h1:text-[2rem] prose-h1:leading-tight prose-h1:mb-6",
  "prose-h2:mt-12 prose-h2:mb-4 prose-h2:border-t prose-h2:border-border prose-h2:pt-8 prose-h2:text-[1.2rem] sm:prose-h2:text-[1.4rem]",
  "prose-h3:text-lg prose-h3:mt-8",
  // The report opens with an h2 — strip its top rule/margin so it doesn't
  // start with a stray divider.
  "[&>h2:first-child]:mt-0 [&>h2:first-child]:border-0 [&>h2:first-child]:pt-0",
  "[&>*:first-child]:mt-0",
  "prose-p:text-foreground/80 prose-li:text-foreground/80",
  "prose-a:text-brand prose-a:font-medium prose-a:no-underline hover:prose-a:underline",
  "prose-strong:text-foreground prose-strong:font-semibold",
  "prose-blockquote:border-l-2 prose-blockquote:border-brand prose-blockquote:not-italic prose-blockquote:text-foreground/70",
  "prose-code:font-mono prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none",
  "prose-table:w-full prose-table:break-normal",
  "prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-2.5 prose-th:font-semibold prose-th:text-left prose-th:break-normal",
  "prose-td:border prose-td:border-border prose-td:p-2.5 prose-td:align-top prose-td:break-normal",
].join(" ");

export function ReportPanel({
  markdown,
  score,
  sources,
  isRunning = false,
}: {
  markdown: string;
  score?: ScoreEvent;
  sources: Source[];
  isRunning?: boolean;
}) {
  const [activeSlug, setActiveSlug] = useState<string>();
  const articleRef = useRef<HTMLDivElement>(null);
  const headings = useMemo(() => extractHeadings(markdown), [markdown]);
  const headingComponents = useHeadingComponents();
  const markdownComponents: Components = {
    ...headingComponents,
    table: ({ children }) => (
      <div className="scroll-touch my-6 overflow-x-auto rounded-lg border border-border">
        <table
          className="w-full min-w-[560px] table-fixed break-normal sm:min-w-[900px]"
          style={{ overflowWrap: "normal", wordBreak: "normal" }}
        >
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th
        className="break-normal border border-border bg-muted p-2.5 text-left font-semibold"
        style={{ overflowWrap: "normal", wordBreak: "normal" }}
      >
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td
        className="break-normal border border-border p-2.5 align-top"
        style={{ overflowWrap: "normal", wordBreak: "normal" }}
      >
        {children}
      </td>
    ),
  };

  useEffect(() => {
    const container = articleRef.current;
    if (!container) return;
    const sectionHeadings = Array.from(
      container.querySelectorAll("h2[id]"),
    ) as HTMLElement[];
    if (sectionHeadings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) {
          setActiveSlug(visible[0].target.id);
        }
      },
      { rootMargin: "-100px 0px -70% 0px" },
    );
    sectionHeadings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [markdown]);

  function handleNavigate(slug: string) {
    const target = document.getElementById(slug);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top, behavior: "smooth" });
    setActiveSlug(slug);
  }

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-xl border-b border-border px-[clamp(20px,4vw,56px)] py-4">
        <div>
          <span className="text-[10px] font-semibold tracking-[0.16em] text-brand uppercase">
            Scout report
          </span>
          <h2 className="font-serif text-lg font-semibold tracking-tight">
            Research verdict
          </h2>
        </div>
        {markdown && <ReportToolbar markdown={markdown} />}
      </div>

      <div className="px-[clamp(20px,4vw,56px)] py-6 sm:py-8">
        {markdown ? (
          <div className="flex gap-10">
            <ReportTableOfContents
              headings={headings}
              activeSlug={activeSlug}
              onNavigate={handleNavigate}
            />
            <div className="min-w-0 flex-1">
              {score && (
                <div className="mb-10">
                  <ScoreBreakdown score={score} />
                </div>
              )}
              <article ref={articleRef} className={PROSE_CLASSES}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {markdown}
                </ReactMarkdown>
              </article>

              {!!sources.length && (
                <footer className="mx-auto mt-12 max-w-2xl border-t border-border pt-6">
                  <h3 className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    Verified sources
                  </h3>
                  <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {sources.map((source, index) => (
                      <a
                        key={source.url}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="grid min-w-0 grid-cols-[24px_1fr_14px] items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-xs text-foreground/80 transition-colors hover:border-border hover:bg-muted"
                      >
                        <span className="font-mono text-[10px] text-brand">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="truncate">
                          {source.title || new URL(source.url).hostname}
                        </span>
                        <ExternalLink size={12} className="text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </footer>
              )}
            </div>
          </div>
        ) : isRunning ? (
          <div className="min-h-[440px]">
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full border border-border bg-card">
                <Loader2 size={20} className="animate-spin text-brand" />
              </span>
              <h3 className="mt-4 font-serif text-lg font-semibold text-foreground">
                The team is researching your idea
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Follow the live activity on the left. The report streams in as
                each specialist finishes.
              </p>
            </div>
            <div className="mx-auto mt-12 max-w-2xl space-y-3">
              {[92, 78, 85, 60, 88, 70].map((width, index) => (
                <div
                  key={index}
                  className="h-3 animate-pulse rounded bg-muted"
                  style={{ width: `${width}%` }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid min-h-[440px] place-content-center justify-items-center text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full border border-border text-muted-foreground/60">
              <ScoutMark size={26} />
            </span>
            <h3 className="mt-5 font-serif text-lg font-semibold text-foreground">
              Your evidence-backed report will appear here
            </h3>
            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Market, competition, customers, distribution, moat, risks, and the
              experiments to run next.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
