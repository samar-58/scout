import type { ReactNode } from "react";

/**
 * Shared chrome for canvas boards so every panel shares one visual rhythm:
 * amber eyebrow, serif title, optional description, then content.
 */
export function CanvasSection({
  eyebrow,
  title,
  description,
  action,
  id,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-xl border border-border bg-card p-4 shadow-sm scroll-mt-20 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] font-semibold tracking-[0.16em] text-brand uppercase">
            {eyebrow}
          </span>
          <h3 className="mt-1 font-serif text-base font-semibold tracking-tight sm:text-lg">
            {title}
          </h3>
          {description && (
            <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
