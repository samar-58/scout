import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  body,
  align = "left",
  className,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      <span className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
        {eyebrow}
      </span>
      <h2 className="mt-3 font-serif text-[1.75rem] leading-tight font-semibold tracking-tight text-balance sm:text-3xl">
        {title}
      </h2>
      {body && (
        <p className="mt-3.5 text-[15px] leading-relaxed text-muted-foreground">
          {body}
        </p>
      )}
    </div>
  );
}
