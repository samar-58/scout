"use client";

import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarkdownHeading } from "@/lib/markdown-headings";

export function ReportTableOfContents({
  headings,
  activeSlug,
  onNavigate,
}: {
  headings: MarkdownHeading[];
  activeSlug?: string;
  onNavigate: (slug: string) => void;
}) {
  const sections = headings.filter((heading) => heading.depth === 2);
  if (sections.length === 0) return null;

  const activeIndex = sections.findIndex((s) => s.slug === activeSlug);
  const current = activeIndex >= 0 ? activeIndex + 1 : 1;

  function handleBackToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <nav
      aria-label="Report sections"
      className="hidden w-[210px] shrink-0 self-start rounded-lg border border-border bg-secondary/30 p-3 lg:sticky lg:top-24 lg:z-10 lg:block"
      style={{ position: "sticky", top: "6rem", alignSelf: "flex-start" }}
    >
      <p className="mb-3 flex items-baseline justify-between text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        On this page
        <span className="font-mono tracking-normal text-muted-foreground/70 normal-case">
          {current}/{sections.length}
        </span>
      </p>

      <ul className="space-y-0.5 border-l border-border pr-1">
        {sections.map((heading) => {
          const isActive = activeSlug === heading.slug;
          return (
            <li key={heading.slug}>
              <button
                type="button"
                title={heading.text}
                onClick={() => onNavigate(heading.slug)}
                className={cn(
                  "-ml-px block w-full cursor-pointer truncate border-l-2 py-1.5 pl-3 text-left text-[12.5px] leading-snug transition-colors",
                  isActive
                    ? "border-brand font-semibold text-brand"
                    : "border-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                {heading.text}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={handleBackToTop}
        className="mt-3 flex cursor-pointer items-center gap-1.5 border-t border-border pt-3 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowUp size={13} />
        Back to top
      </button>
    </nav>
  );
}
