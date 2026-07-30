"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface RailItem {
  id: string;
  label: string;
  icon: LucideIcon;
  count?: number;
}

/**
 * Section navigation for the canvas. On desktop it is a sticky rail with
 * scroll-spy; below xl it collapses to a horizontal chip strip so it never
 * competes with the content for width.
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
        // Track the topmost section currently inside the reading band rather
        // than the last one to intersect, which jitters on fast scrolls.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) =>
              left.boundingClientRect.top - right.boundingClientRect.top,
          );
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: [0, 0.25] },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [items]);

  return (
    <>
      {/* Desktop rail */}
      <nav
        aria-label="Canvas sections"
        className="sticky top-[76px] hidden max-h-[calc(100dvh-96px)] overflow-auto xl:block"
      >
        <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          Canvas
        </p>
        <ul className="space-y-0.5">
          {items.map((item, index) => {
            const active = activeId === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors",
                    active
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "font-mono text-[10px]",
                      active ? "text-brand" : "text-muted-foreground/60",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <item.icon
                    size={14}
                    strokeWidth={1.9}
                    className={active ? "text-brand" : undefined}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                    {item.label}
                  </span>
                  {typeof item.count === "number" && (
                    <span className="font-mono text-[10px] text-muted-foreground/70">
                      {item.count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile / tablet chip strip */}
      <nav
        aria-label="Canvas sections"
        className="scroll-touch -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 xl:hidden"
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
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                active
                  ? "border-brand/40 bg-brand-muted text-brand"
                  : "border-border bg-card text-foreground/70 hover:border-border-strong hover:text-foreground",
              )}
            >
              <item.icon size={13} strokeWidth={1.9} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </>
  );
}
