import { cn } from "@/lib/utils";

/**
 * Scout brand mark — a minimal compass rose. The vertical needle is solid,
 * the horizontal needle is dimmed, and a faint ring frames it. Uses
 * currentColor throughout so it inherits from its container (ink on paper,
 * paper on ink, or brand amber).
 */
export function ScoutMark({
  className,
  size = 24,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9.25"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.35"
      />
      {/* Horizontal needle (dimmed) */}
      <path d="M3.75 12 L12 9.85 L20.25 12 L12 14.15 Z" fill="currentColor" opacity="0.45" />
      {/* Vertical needle (solid) */}
      <path d="M12 3.75 L14.15 12 L12 20.25 L9.85 12 Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Full lockup: the mark inside a rounded ink tile, next to the serif wordmark.
 * `tone` controls the tile treatment.
 */
export function ScoutLogo({
  className,
  markSize = 15,
  wordmark = true,
  tileClassName,
  textClassName,
}: {
  className?: string;
  markSize?: number;
  wordmark?: boolean;
  tileClassName?: string;
  textClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "grid place-items-center rounded-md bg-foreground text-background",
          tileClassName,
        )}
        style={{ width: markSize + 14, height: markSize + 14 }}
      >
        <ScoutMark size={markSize} />
      </span>
      {wordmark && (
        <span
          className={cn(
            "font-serif text-lg font-semibold tracking-tight",
            textClassName,
          )}
        >
          Scout
        </span>
      )}
    </span>
  );
}
