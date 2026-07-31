"use client";

import { CanvasSection } from "@/components/canvas/canvas-section";
import type { Source } from "@/lib/types";

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * The bibliography.
 *
 * Favicons made this a grid of third-party images — a request per source, each
 * one a different colour, for no informational gain. A numbered list of titles
 * and domains is what a citation list is.
 */
export function SourcesPanel({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;

  return (
    <CanvasSection
      id="sources"
      eyebrow="Sources"
      title={`${sources.length} sources behind this canvas`}
      description="Deduplicated by URL. Every claim above traces back to this set."
    >
      <ol className="grid gap-x-10 sm:grid-cols-2">
        {sources.map((source, position) => (
          <li
            key={source.url}
            className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] items-baseline border-b border-border py-2"
          >
            <span className="text-[11px] tabular-nums text-subtle-foreground">
              {String(position + 1).padStart(2, "0")}
            </span>
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 underline-offset-4 hover:underline"
            >
              <span className="block truncate text-[13px] text-foreground/85">
                {source.title || hostname(source.url)}
              </span>
              {source.title && (
                <span className="block truncate text-[11.5px] text-muted-foreground">
                  {hostname(source.url)}
                </span>
              )}
            </a>
          </li>
        ))}
      </ol>
    </CanvasSection>
  );
}
