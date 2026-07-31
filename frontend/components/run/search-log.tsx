"use client";

import { Check, LoaderCircle, X } from "lucide-react";
import type { SearchEvent, SearchResult } from "@/lib/types";
import { cn } from "@/lib/utils";

function hostnameOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * The search log.
 *
 * Each search is a line: what it was for, the query it ran, how many results it
 * returned, and the domains behind them. Sources are text links rather than
 * favicon pills — eight searches × four results is 32 chips, which was the
 * single busiest surface in the app.
 */
export function SearchLog({ searches }: { searches: SearchEvent[] }) {
  if (searches.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Web searches and their sources will appear here.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-border border-y border-border">
      {searches.map((item) => (
        <li key={item.index} className="py-3">
          <div className="flex items-baseline gap-2.5">
            <State status={item.status} />
            <p className="min-w-0 flex-1 text-[13px] font-medium">
              {item.purpose || item.query}
            </p>
            <span className="shrink-0 text-[11px] tabular-nums text-subtle-foreground">
              {item.status === "running"
                ? "searching"
                : `${item.result_count ?? (item.top_results ?? []).length} results`}
            </span>
          </div>

          {item.query && (
            <p className="mt-1 truncate pl-5 font-mono text-[11px] text-muted-foreground">
              {item.query}
            </p>
          )}

          {item.error && (
            <p className="mt-1 pl-5 text-[12px] text-destructive">{item.error}</p>
          )}

          <Sources results={item.top_results ?? []} />
        </li>
      ))}
    </ol>
  );
}

function Sources({ results }: { results: SearchResult[] }) {
  const usable = results.filter((result) => result.url);
  if (usable.length === 0) return null;

  return (
    <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 pl-5">
      {usable.map((result, index) => (
        <li key={result.url ?? index} className="min-w-0">
          <a
            href={result.url}
            target="_blank"
            rel="noreferrer"
            title={result.title || result.url}
            className="text-[12px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {hostnameOf(result.url!)}
          </a>
        </li>
      ))}
    </ul>
  );
}

function State({ status }: { status: SearchEvent["status"] }) {
  const base = "w-3.5 shrink-0";
  if (status === "running") {
    return <LoaderCircle size={13} className={cn(base, "spin text-brand")} />;
  }
  if (status === "failed") {
    return <X size={13} strokeWidth={2.5} className={cn(base, "text-destructive")} />;
  }
  return <Check size={13} strokeWidth={2.5} className={cn(base, "text-success")} />;
}
