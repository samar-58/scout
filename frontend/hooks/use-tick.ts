"use client";

import { useEffect, useState } from "react";

/**
 * Re-renders on an interval while `active`, so views can show clocks that
 * advance between server polls.
 *
 * Events arrive in ~800ms batches. Without a local tick the interface only
 * changes when a batch lands, which made a run that was very much in progress
 * look frozen. This is the local clock; the server still owns every fact.
 */
export function useTick(active: boolean, intervalMs = 250) {
  const [, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs]);
}

/** Seconds since an ISO timestamp, or undefined when it cannot be parsed. */
export function secondsSince(iso?: string): number | undefined {
  if (!iso) return undefined;
  const start = Date.parse(iso);
  if (Number.isNaN(start)) return undefined;
  return Math.max(0, (Date.now() - start) / 1000);
}
