import { ExternalLink, LoaderCircle, Search } from "lucide-react";
import type { SearchEvent } from "@/lib/types";

export function SearchActivityPanel({ searches }: { searches: SearchEvent[] }) {
  const completedCount = searches.filter(
    (item) => item.status === "completed",
  ).length;

  return (
    <section className="min-h-[290px] max-h-[390px] overflow-auto rounded-lg border border-border bg-card p-4.5 shadow-sm">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[10px] font-extrabold tracking-[0.14em] text-primary">03</span>
          <h2 className="font-serif text-lg font-bold">Search activity</h2>
        </div>
        <span className="font-mono text-[11px] font-bold text-muted-foreground">
          {completedCount}/{searches.length || 8}
        </span>
      </div>
      {searches.length === 0 ? (
        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
          Tavily queries and evidence will appear here.
        </p>
      ) : (
        <div className="mt-1">
          {searches.map((item) => (
            <article key={item.index} className="border-b border-border/60 py-2.5 last:border-b-0">
              <div className="grid grid-cols-[18px_1fr_auto] items-center gap-1.5 text-success">
                {item.status === "running" ? (
                  <LoaderCircle className="spin" size={14} />
                ) : (
                  <Search size={14} />
                )}
                <strong className="block text-[11px] font-bold">
                  {item.purpose || `Search ${item.index}`}
                </strong>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {item.result_count ?? "…"}
                </span>
              </div>
              <p className="my-1.5 font-mono text-[10px] leading-snug text-muted-foreground [overflow-wrap:anywhere]">
                {item.query}
              </p>
              {item.error && (
                <small className="text-destructive">{item.error}</small>
              )}
              {!!item.top_results?.length && (
                <div className="flex flex-wrap gap-1.5">
                  {item.top_results.map(
                    (source) =>
                      source.url && (
                        <a
                          key={source.url}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex max-w-[180px] items-center gap-1 overflow-hidden whitespace-nowrap rounded-md border border-success/30 bg-success/5 px-1.5 py-1 text-[9px] text-ellipsis text-success"
                        >
                          {source.title || new URL(source.url).hostname}
                          <ExternalLink size={11} />
                        </a>
                      ),
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
