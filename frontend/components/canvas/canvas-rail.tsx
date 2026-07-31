"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface RailItem {
  id: string;
  label: string;
  count?: number;
}

/**
 * Section navigation for the canvas: a table of contents.
 *
 * Text and counts only. Icons and numbered prefixes were decoration — nine
 * distinct glyphs the reader had to learn to get information the labels already
 * carried. Below `xl` it becomes a horizontal strip of the same text.
 */
export function CanvasRail({
  items,
  onNavigate,
}: {
  items: RailItem[];
  onNavigate: (id: string) => void;
}) {
  const [activeId, setActiveId] = useState<string>();

  useEffect(() => {
    const targets = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Track the topmost section inside the reading band rather than the last
        // one to intersect, which jitters on fast scrolls.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) =>
              left.boundingClientRect.top - right.boundingClientRect.top,
          );
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-88px 0px -60% 0px", threshold: [0, 0.25] },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [items]);

  return (
    <>
      <nav
        aria-label="Canvas sections"
        className="sticky top-[68px] hidden max-h-[calc(100dvh-88px)] overflow-auto xl:block"
      >
        <ul className="space-y-px border-l border-border">
          {items.map((item) => {
            const active = activeId === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "-ml-px flex w-full items-baseline gap-2 border-l py-1.5 pl-3 text-left text-[13px] transition-colors",
                    active
                      ? "border-foreground font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {typeof item.count === "number" && (
                    <span className="text-[11px] tabular-nums text-subtle-foreground">
                      {item.count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav
        aria-label="Canvas sections"
        className="scroll-touch -mx-4 flex gap-4 overflow-x-auto border-b border-border px-4 pb-2.5 sm:-mx-6 sm:px-6 xl:hidden"
      >
        {items.map((item) => {
          const active = activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "shrink-0 text-[13px] whitespace-nowrap transition-colors",
                active
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </>
  );
}
