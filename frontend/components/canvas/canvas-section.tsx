import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Shared chrome for canvas boards. Each board is a numbered chapter with an
 * icon, a serif title and a hairline rule, so a long canvas reads as a
 * structured document rather than an undifferentiated stack of cards.
 */
export function CanvasSection({
  index,
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
  id,
  children,
}: {
  index: number;
  icon: LucideIcon;
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
      className="surface-raised scroll-mt-24 rounded-2xl border border-border p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 gap-3.5">
          <span
            aria-hidden="true"
            className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-sunken text-brand"
          >
            <Icon size={16} strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <span className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.16em] text-brand uppercase">
              <span className="font-mono text-muted-foreground/70">
                {String(index).padStart(2, "0")}
              </span>
              {eyebrow}
            </span>
            <h3 className="mt-1 font-serif text-[1.1rem] leading-tight font-semibold tracking-tight sm:text-[1.25rem]">
              {title}
            </h3>
            {description && (
              <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
