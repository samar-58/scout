/**
 * Presentation-only formatters shared by the persistence surfaces.
 *
 * Kept dependency-free and locale-aware via `Intl`. Every function tolerates
 * null/undefined because run timestamps are nullable until a run finishes.
 */

const DATE_TIME = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const DATE_ONLY = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const RELATIVE = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export function formatDateTime(value?: string | null, fallback = "—") {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : DATE_TIME.format(date);
}

export function formatDate(value?: string | null, fallback = "—") {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : DATE_ONLY.format(date);
}

/** "3 hours ago" style label, coarsening the unit as the gap grows. */
export function formatRelative(value?: string | null, fallback = "—") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  const delta = date.getTime() - Date.now();
  const magnitude = Math.abs(delta);

  if (magnitude < MINUTE) return "just now";
  if (magnitude < HOUR) return RELATIVE.format(Math.round(delta / MINUTE), "minute");
  if (magnitude < DAY) return RELATIVE.format(Math.round(delta / HOUR), "hour");
  if (magnitude < WEEK) return RELATIVE.format(Math.round(delta / DAY), "day");
  if (magnitude < MONTH) return RELATIVE.format(Math.round(delta / WEEK), "week");
  if (magnitude < YEAR) return RELATIVE.format(Math.round(delta / MONTH), "month");
  return RELATIVE.format(Math.round(delta / YEAR), "year");
}

/** Duration between two timestamps, as a compact human string. */
export function formatDuration(
  from?: string | null,
  to?: string | null,
  fallback = "—",
) {
  if (!from || !to) return fallback;
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return fallback;

  const seconds = Math.round((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes < 60) return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/** Pluralise without pulling in a dependency: `plural(1, "run")` → "1 run". */
export function plural(count: number, singular: string, suffix = "s") {
  return `${count} ${singular}${count === 1 ? "" : suffix}`;
}

/** Two-letter initials for an avatar-style tile, derived from a project name. */
export function initials(value: string) {
  const words = value
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "S";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
