"use client";

import { ExternalLink } from "lucide-react";
import { CanvasSection } from "@/components/canvas/canvas-section";
import type { Source } from "@/lib/types";

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SourcesPanel({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;

  return (
    <CanvasSection
      id="sources"
      eyebrow="Verified sources"
      title={`${sources.length} sources behind this canvas`}
      description="Deduplicated by URL. Every claim above traces back to this set."
    >
      <div className="grid gap-1.5 sm:grid-cols-2">
        {sources.map((source, index) => (
          <a
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="grid min-w-0 grid-cols-[24px_1fr_14px] items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-[12.5px] text-foreground/80 transition-colors hover:border-border hover:bg-muted"
          >
            <span className="font-mono text-[10px] text-brand">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="truncate">{source.title || hostname(source.url)}</span>
            <ExternalLink size={12} className="text-muted-foreground" />
          </a>
        ))}
      </div>
    </CanvasSection>
  );
}
