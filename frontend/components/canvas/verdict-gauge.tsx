"use client";

import type { DecisionTone } from "@/lib/report-canvas";

const TONE_VAR: Record<DecisionTone, string> = {
  proceed: "var(--success)",
  narrow: "var(--brand)",
  investigate: "var(--warning)",
  reconsider: "var(--destructive)",
};

const SIZE = 168;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
/** Three-quarter sweep, opening at the bottom. */
const SWEEP = 270;
const START_ANGLE = 135;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_LENGTH = CIRCUMFERENCE * (SWEEP / 360);

/**
 * The headline number as a dial rather than a digit on its own. A 0-100 score
 * means little without a visible range; the arc supplies it, and the tick marks
 * show the band thresholds the recommendation is derived from.
 */
export function VerdictGauge({
  value,
  tone,
  confidence,
}: {
  value: number;
  tone: DecisionTone;
  confidence?: number;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const progress = (clamped / 100) * ARC_LENGTH;

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        role="img"
        aria-label={`Overall score ${clamped} out of 100`}
      >
        <g transform={`rotate(${START_ANGLE} ${SIZE / 2} ${SIZE / 2})`}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={TONE_VAR[tone]}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${progress} ${CIRCUMFERENCE}`}
            style={{ transition: "stroke-dasharray 900ms cubic-bezier(.22,1,.36,1)" }}
          />
          {/* Band thresholds: reconsider | investigate | narrow | proceed */}
          {[35, 50, 70].map((threshold) => {
            const angle = (threshold / 100) * SWEEP;
            return (
              <line
                key={threshold}
                x1={SIZE / 2 + RADIUS - STROKE / 2}
                y1={SIZE / 2}
                x2={SIZE / 2 + RADIUS + STROKE / 2}
                y2={SIZE / 2}
                stroke="var(--background)"
                strokeWidth={1.5}
                transform={`rotate(${angle} ${SIZE / 2} ${SIZE / 2})`}
              />
            );
          })}
        </g>
      </svg>

      <div className="absolute inset-0 grid place-content-center text-center">
        <div className="flex items-baseline justify-center">
          <strong className="font-serif text-[2.6rem] leading-none font-semibold tabular-nums">
            {clamped}
          </strong>
          <span className="ml-0.5 font-mono text-[11px] text-muted-foreground">
            /100
          </span>
        </div>
        {typeof confidence === "number" && (
          <span className="mt-1.5 font-mono text-[10px] tracking-wide text-muted-foreground">
            {confidence}% confidence
          </span>
        )}
      </div>
    </div>
  );
}
