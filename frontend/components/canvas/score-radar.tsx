"use client";

import type { CanvasDimension } from "@/lib/report-canvas";

/**
 * Six scored dimensions on six axes — the shape of the idea at a glance.
 *
 * Six stacked progress bars force serial reading and hide the thing that
 * matters most: whether the profile is balanced or spiky. A radar shows that
 * instantly. Pure SVG, no charting dependency, and it renders identically on
 * the server.
 */

const SIZE = 260;
const CENTER = SIZE / 2;
const RADIUS = 82;
const LABEL_RADIUS = RADIUS + 26;
const RINGS = [2, 4, 6, 8, 10];

/** Axis angles start at the top and step by 60°. */
function axisPoint(index: number, total: number, radius: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  };
}

function polygon(radii: number[], total: number) {
  return radii
    .map((radius, index) => {
      const point = axisPoint(index, total, radius);
      return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    })
    .join(" ");
}

export function ScoreRadar({
  dimensions,
  className,
}: {
  dimensions: CanvasDimension[];
  className?: string;
}) {
  if (dimensions.length < 3) return null;

  const total = dimensions.length;
  const valuePolygon = polygon(
    dimensions.map((dimension) => (dimension.score / 10) * RADIUS),
    total,
  );

  return (
    <figure className={className}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-auto w-full max-w-[300px]"
        role="img"
        aria-label={`Score radar: ${dimensions
          .map((dimension) => `${dimension.label} ${dimension.score} of 10`)
          .join(", ")}`}
      >
        {/* Reference rings */}
        {RINGS.map((ring) => (
          <polygon
            key={ring}
            points={polygon(
              dimensions.map(() => (ring / 10) * RADIUS),
              total,
            )}
            fill="none"
            stroke="var(--border)"
            strokeWidth={ring === 10 ? 1.2 : 0.7}
            opacity={ring === 10 ? 0.9 : 0.55}
          />
        ))}

        {/* Axes */}
        {dimensions.map((dimension, index) => {
          const outer = axisPoint(index, total, RADIUS);
          return (
            <line
              key={dimension.key}
              x1={CENTER}
              y1={CENTER}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--border)"
              strokeWidth={0.7}
              opacity={0.6}
            />
          );
        })}

        {/*
          Scored area in ink, not accent: the shape is the data, and the accent
          is reserved for things you can click.
        */}
        <polygon
          points={valuePolygon}
          fill="var(--foreground)"
          fillOpacity={0.08}
          stroke="var(--foreground)"
          strokeWidth={1.4}
          strokeLinejoin="round"
          strokeOpacity={0.75}
        />

        {/* Per-dimension vertices, coloured from the analytical palette */}
        {dimensions.map((dimension, index) => {
          const point = axisPoint(
            index,
            total,
            (dimension.score / 10) * RADIUS,
          );
          return (
            <circle
              key={`${dimension.key}-dot`}
              cx={point.x}
              cy={point.y}
              r={3.4}
              fill={`var(--chart-${dimension.chartIndex})`}
              stroke="var(--card)"
              strokeWidth={1.4}
            />
          );
        })}

        {/* Labels and values */}
        {dimensions.map((dimension, index) => {
          const point = axisPoint(index, total, LABEL_RADIUS);
          const anchor =
            Math.abs(point.x - CENTER) < 6
              ? "middle"
              : point.x > CENTER
                ? "start"
                : "end";
          return (
            <g key={`${dimension.key}-label`}>
              <text
                x={point.x}
                y={point.y - 2}
                textAnchor={anchor}
                className="fill-muted-foreground text-[9px] tracking-wide uppercase"
                style={{ fontSize: 9, letterSpacing: "0.06em" }}
              >
                {dimension.label}
              </text>
              <text
                x={point.x}
                y={point.y + 9}
                textAnchor={anchor}
                className="fill-foreground font-mono"
                style={{ fontSize: 10, fontWeight: 600 }}
              >
                {dimension.score}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
