import type { ReactNode } from "react";

/**
 * Shared chrome for canvas sections.
 *
 * A section is a heading, an optional line of explanation, and its content —
 * separated from the next one by space and a hairline, not by a nested card with
 * an icon tile and a numbered eyebrow. The canvas reads as one document instead
 * of nine stacked panels.
 */
export function CanvasSection({
  eyebrow,
  title,
  description,
  action,
  id,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-border pt-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          {eyebrow && <p className="label pb-1.5">{eyebrow}</p>}
          <h3 className="font-serif text-[1.15rem] leading-tight font-semibold">
            {title}
          </h3>
          {description && (
            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
