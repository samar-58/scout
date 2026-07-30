"use client";

import { ExternalLink, Link2 } from "lucide-react";
import { CanvasSection } from "@/components/canvas/canvas-section";
import type { Source } from "@/lib/types";

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function faviconUrl(url: string) {
  try {
    const { hostname: host } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
  } catch {
    return undefined;
  }
}

export function SourcesPanel({
  sources,
  index,
}: {
  sources: Source[];
  index: number;
}) {
  if (sources.length === 0) return null;

  return (
    <CanvasSection
      id="sources"
      index={index}
      icon={Link2}
      eyebrow="Verified sources"
      title={`${sources.length} sources behind this canvas`}
      description="Deduplicated by URL. Every claim above traces back to this set."
    >
      <ul className="grid gap-2 sm:grid-cols-2">
        {sources.map((source, position) => {
          const favicon = faviconUrl(source.url);
          const domain = hostname(source.url);
          return (
            <li key={source.url} className="min-w-0">
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="group grid min-w-0 grid-cols-[22px_20px_1fr_14px] items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 transition-colors hover:border-border hover:bg-muted/60"
              >
                <span className="font-mono text-[10px] text-muted-foreground/70">
                  {String(position + 1).padStart(2, "0")}
                </span>
                <span className="grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-card">
                  {favicon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={favicon} alt="" className="h-3.5 w-3.5" />
                  ) : (
                    <Link2 size={9} className="text-muted-foreground" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] text-foreground/85">
                    {source.title || domain}
                  </span>
                  {source.title && (
                    <span className="block truncate font-mono text-[10px] text-muted-foreground">
                      {domain}
                    </span>
                  )}
                </span>
                <ExternalLink
                  size={12}
                  className="text-muted-foreground/50 transition-colors group-hover:text-brand"
                />
              </a>
            </li>
          );
        })}
      </ul>
    </CanvasSection>
  );
}
