import { ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ScoreEvent, Source } from "@/lib/types";

export function ReportPanel({
  markdown,
  score,
  sources,
}: {
  markdown: string;
  score?: ScoreEvent;
  sources: Source[];
}) {
  return (
    <section className="min-h-[600px] rounded-lg border border-border bg-card px-[clamp(20px,4vw,60px)] py-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[10px] font-extrabold tracking-[0.14em] text-primary">04</span>
          <h2 className="font-serif text-lg font-bold">Research report</h2>
        </div>
        {score && (
          <div className="flex items-baseline text-success">
            <strong className="font-serif text-3xl font-bold">
              {score.scores.overall}
            </strong>
            <span className="font-mono text-[11px] text-muted-foreground">/100</span>
          </div>
        )}
      </div>

      {markdown ? (
        <article className="prose prose-neutral mx-auto my-6 max-w-3xl font-serif text-[15px] leading-[1.7] [overflow-wrap:anywhere] prose-headings:font-serif prose-h1:text-[31px] prose-h2:border-b prose-h2:border-border prose-h2:pb-1.5 prose-h2:text-xl prose-h3:text-base prose-table:block prose-table:overflow-x-auto prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-2 prose-td:border prose-td:border-border prose-td:p-2">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </article>
      ) : (
        <div className="grid min-h-[450px] place-content-center justify-items-center text-center text-muted-foreground">
          <div className="grid h-[54px] w-[54px] place-items-center rounded-full border border-border font-serif text-2xl italic text-success">
            R
          </div>
          <h3 className="mt-4 font-serif text-lg font-bold text-foreground">
            Your evidence-backed report will stream here
          </h3>
          <p className="mt-1 max-w-[400px] text-xs leading-relaxed">
            Market, competition, customers, distribution, moat, risks, and experiments.
          </p>
        </div>
      )}

      {!!sources.length && (
        <footer className="mx-auto mt-7 max-w-3xl border-t border-border pt-5">
          <h3 className="font-serif text-sm font-bold">Verified sources</h3>
          <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {sources.map((source, index) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="grid min-w-0 grid-cols-[24px_1fr_14px] items-center gap-1.5 rounded-md border border-border p-1.5 text-[10px] text-success"
              >
                <span className="font-mono text-[9px] text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="truncate">
                  {source.title || new URL(source.url).hostname}
                </span>
                <ExternalLink size={12} />
              </a>
            ))}
          </div>
        </footer>
      )}
    </section>
  );
}
