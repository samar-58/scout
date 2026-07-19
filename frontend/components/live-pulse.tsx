import { cn } from "@/lib/utils";

/**
 * Calm "live" indicator — a soft pinging dot rather than a spinning circle.
 * Communicates ongoing activity without the restless spinner UX.
 */
export function LivePulse({
  size = 10,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand/50" />
      <span
        className="relative inline-flex rounded-full bg-brand"
        style={{ width: size * 0.62, height: size * 0.62 }}
      />
    </span>
  );
}
