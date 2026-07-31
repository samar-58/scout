"use client";

import { Check, LoaderCircle, X } from "lucide-react";
import { secondsSince } from "@/hooks/use-tick";
import type { SearchActivity } from "@/lib/run-events";
import type { SearchResult } from "@/lib/types";
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
 * Each search is a line: what it was for, the query, how long it has been
 * running or how many results it returned, and the domains behind them. A search
 * in flight counts up locally, so eight searches resolving over a minute read as
 * work happening rather than a list that occasionally mutates.
 */
export function SearchLog({ searches }: { searches: SearchActivity[] }) {
  if (searches.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Web searches and their sources will appear here.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-border border-y border-border">
      {searches.map((item) => {
        const running = item.status === "running";
        const live = running ? secondsSince(item.since) : undefined;
        const resultCount = item.result_count ?? (item.top_results ?? []).length;

        return (
          <li
            key={item.index}
            className={cn(
              "row-enter -mx-2 px-2 py-3",
              running && "row-working rounded-md",
            )}
          >
            <div className="flex items-baseline gap-2.5">
              <State status={item.status} />
              <p className="min-w-0 flex-1 text-[13px] font-medium">
                {item.purpose || item.query}
              </p>
              <span className="shrink-0 text-[11px] tabular-nums">
                {running ? (
                  <span className="text-muted-foreground">
                    {live !== undefined ? `${live.toFixed(1)}s` : "searching"}
                  </span>
                ) : (
                  <span className="text-subtle-foreground">
                    {item.elapsed_ms !== undefined
                      ? `${(item.elapsed_ms / 1000).toFixed(1)}s · ${resultCount}`
                      : `${resultCount} results`}
                  </span>
                )}
              </span>
            </div>

            {item.query && (
              <p
                className={cn(
                  "mt-1 truncate pl-5 font-mono text-[11px] text-muted-foreground",
                  running && "dots",
                )}
              >
                {item.query}
              </p>
            )}

            {item.error && (
              <p className="mt-1 pl-5 text-[12px] text-destructive">{item.error}</p>
            )}

            <Sources results={item.top_results ?? []} />
          </li>
        );
      })}
    </ol>
  );
}

function Sources({ results }: { results: SearchResult[] }) {
  const usable = results.filter((result) => result.url);
  if (usable.length === 0) return null;

  return (
    <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 pl-5">
      {usable.map((result, index) => (
        <li key={result.url ?? index} className="row-enter min-w-0">
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

function State({ status }: { status: SearchActivity["status"] }) {
  const base = "w-3.5 shrink-0";
  if (status === "running") {
    return <LoaderCircle size={13} className={cn(base, "spin text-brand")} />;
  }
  if (status === "failed") {
    return <X size={13} strokeWidth={2.5} className={cn(base, "text-destructive")} />;
  }
  return <Check size={13} strokeWidth={2.5} className={cn(base, "text-success")} />;
}
