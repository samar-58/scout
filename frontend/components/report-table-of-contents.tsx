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
      className="hidden shrink-0 basis-[210px] self-start lg:sticky lg:top-24 lg:flex lg:h-[calc(100vh-7.5rem)] lg:flex-col"
    >
      <p className="mb-3 flex items-baseline justify-between text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        On this page
        <span className="font-mono tracking-normal text-muted-foreground/70 normal-case">
          {current}/{sections.length}
        </span>
      </p>

      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto border-l border-border">
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
