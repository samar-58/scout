"use client";

import { useEffect, useState } from "react";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";

type Mode = "datetime" | "date" | "relative";

const FORMATTERS: Record<Mode, (value?: string | null) => string> = {
  datetime: (value) => formatDateTime(value),
  date: (value) => formatDate(value),
  relative: (value) => formatRelative(value),
};

/**
 * Renders a timestamp in the *viewer's* locale without a hydration mismatch.
 *
 * `Intl` resolves against the server's locale and time zone during SSR, so a
 * run created at 14:30 UTC was rendered as "14:30" on the server and "2:30 pm"
 * in the browser — React then discarded the tree with a hydration error. The
 * first client render deliberately matches the server (a locale-independent ISO
 * date), and the localised string is swapped in after mount.
 */
export function LocalTime({
  value,
  mode = "datetime",
  className,
  fallback = "—",
}: {
  value?: string | null;
  mode?: Mode;
  className?: string;
  fallback?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!value) return <span className={className}>{fallback}</span>;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return <span className={className}>{fallback}</span>;
  }

  return (
    <time dateTime={value} className={className}>
      {mounted ? FORMATTERS[mode](value) : date.toISOString().slice(0, 10)}
    </time>
  );
}
