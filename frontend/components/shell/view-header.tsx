"use client";

import type { ReactNode } from "react";
import { SidebarTrigger } from "@/components/shell/workspace-shell";
import { cn } from "@/lib/utils";

/**
 * The one header a workspace view gets: drawer trigger, title, and actions on a
 * single 52px line.
 *
 * Deliberately not a hero. Each view already states what it is through its
 * content; repeating that in a large title block above the fold just pushed the
 * work down the page. Titles are 14px here, and the page's own first heading
 * carries the typographic weight where one is warranted.
 */
export function ViewHeader({
  title,
  meta,
  actions,
  className,
  children,
}: {
  title: ReactNode;
  /** Small trailing detail after the title — status, counts, elapsed time. */
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Optional second row (filters, tabs) that scrolls away with the header. */
  children?: ReactNode;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b border-border bg-background/85 pt-safe backdrop-blur-md",
        className,
      )}
    >
      <div className="flex h-13 items-center gap-3 px-3 sm:px-5">
        <SidebarTrigger />
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <h1 className="min-w-0 truncate text-[14px] font-medium">{title}</h1>
          {meta}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
