"use client";

import { Check, LoaderCircle, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchEvent, SearchResult } from "@/lib/types";

function faviconUrl(url: string) {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return undefined;
  }
}

function hostnameOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function SourceChip({ source }: { source: SearchResult }) {
  if (!source.url) return null;
  const favicon = faviconUrl(source.url);
  const domain = hostnameOf(source.url);
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      title={source.title || domain}
      className="inline-flex max-w-[190px] items-center gap-1.5 rounded-full border border-border bg-background py-1 pr-2.5 pl-1 text-[11px] text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground"
    >
      <span className="grid h-4.5 w-4.5 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">
        {favicon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={favicon} alt="" className="h-3.5 w-3.5" />
        ) : (
          <Search size={9} />
        )}
      </span>
      <span className="truncate">{domain}</span>
    </a>
  );
}

function StatusDot({ status }: { status: SearchEvent["status"] }) {
  if (status === "running")
    return <LoaderCircle className="spin text-brand" size={14} />;
  if (status === "failed")
    return <X className="text-destructive" size={14} />;
  return <Check className="text-success" size={14} />;
}

function SearchRow({ item }: { item: SearchEvent }) {
  const sources = item.top_results ?? [];
  return (
    <article className="rounded-lg border border-border bg-card p-3 duration-300 animate-in fade-in slide-in-from-left-2">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted">
          <StatusDot status={item.status} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-snug font-semibold text-foreground">
            {item.purpose || item.query}
          </p>
          {item.query && (
            <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
              {item.query}
            </p>
          )}
        </div>
        <span className="shrink-0 pt-0.5 font-mono text-[10px] text-muted-foreground">
          {item.status === "running"
            ? "searching"
            : `${item.result_count ?? sources.length}`}
        </span>
      </div>

      {item.error && (
        <p className="mt-2 text-[11px] text-destructive">{item.error}</p>
      )}

      {sources.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {sources.map((source, index) => (
            <SourceChip key={source.url ?? index} source={source} />
          ))}
        </div>
      )}
    </article>
  );
}

export function SearchActivityPanel({
  searches,
  bare = false,
}: {
  searches: SearchEvent[];
  bare?: boolean;
}) {
  const completedCount = searches.filter(
    (item) => item.status === "completed",
  ).length;

  const body =
    searches.length === 0 ? (
      <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
        Web searches and their sources will appear here.
      </p>
    ) : (
      <div className={cn("space-y-2.5", !bare && "mt-3 flex-1 overflow-auto pr-1")}>
        {searches.map((item) => (
          <SearchRow key={item.index} item={item} />
        ))}
      </div>
    );

  if (bare) return body;

  return (
    <section className="flex h-full min-h-[420px] flex-col rounded-lg border border-border bg-card p-4.5 shadow-sm">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[10px] font-semibold tracking-[0.16em] text-brand uppercase">
            Evidence
          </span>
          <h2 className="font-serif text-lg font-semibold">Search activity</h2>
        </div>
        <span className="font-mono text-[11px] font-semibold text-muted-foreground">
          {completedCount}/{searches.length || 8}
        </span>
      </div>
      {body}
    </section>
  );
}
