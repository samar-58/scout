import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ScoreRadar } from "@/components/canvas/score-radar";
import { VerdictGauge } from "@/components/canvas/verdict-gauge";
import type { CanvasDimension } from "@/lib/report-canvas";

function dimensions(scores: number[]): CanvasDimension[] {
  const labels = [
    "Market",
    "Competition",
    "Distribution",
    "Execution",
    "Timing",
    "Monetization",
  ];
  return scores.map((score, index) => ({
    key: labels[index].toLowerCase(),
    label: labels[index],
    score,
    chartIndex: index + 1,
  }));
}

describe("ScoreRadar", () => {
  test("emits finite coordinates for every axis", () => {
    const markup = renderToStaticMarkup(
      ScoreRadar({ dimensions: dimensions([7, 4, 3, 6, 8, 5]) }),
    );
    expect(markup).not.toContain("NaN");
    expect(markup).not.toContain("Infinity");
    expect(markup).toContain("<svg");
  });

  test("draws one coloured vertex per dimension", () => {
    const markup = renderToStaticMarkup(
      ScoreRadar({ dimensions: dimensions([7, 4, 3, 6, 8, 5]) }),
    );
    const vertices = markup.match(/<circle/g) ?? [];
    expect(vertices).toHaveLength(6);
    for (let index = 1; index <= 6; index += 1) {
      expect(markup).toContain(`var(--chart-${index})`);
    }
  });

  test("handles the extremes without leaving the plot", () => {
    const markup = renderToStaticMarkup(
      ScoreRadar({ dimensions: dimensions([0, 0, 0, 10, 10, 10]) }),
    );
    expect(markup).not.toContain("NaN");
    // Every point must sit inside the 260x260 viewBox.
    const numbers = (markup.match(/points="([^"]+)"/g) ?? [])
      .flatMap((group) => group.replace('points="', "").replace('"', "").split(/[\s,]+/))
      .map(Number)
      .filter((value) => !Number.isNaN(value));
    expect(numbers.length).toBeGreaterThan(0);
    expect(Math.min(...numbers)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...numbers)).toBeLessThanOrEqual(260);
  });

  test("renders nothing when there are too few axes for a polygon", () => {
    expect(ScoreRadar({ dimensions: dimensions([5, 5]) })).toBeNull();
  });

  test("exposes the scores to assistive technology", () => {
    const markup = renderToStaticMarkup(
      ScoreRadar({ dimensions: dimensions([7, 4, 3, 6, 8, 5]) }),
    );
    expect(markup).toContain('role="img"');
    expect(markup).toContain("Market 7 of 10");
  });
});

describe("VerdictGauge", () => {
  test("clamps out-of-range scores and stays finite", () => {
    for (const value of [-20, 0, 58, 100, 140]) {
      const markup = renderToStaticMarkup(
        VerdictGauge({ value, tone: "narrow", confidence: 62 }),
      );
      expect(markup).not.toContain("NaN");
      expect(markup).toContain('role="img"');
    }
    expect(
      renderToStaticMarkup(VerdictGauge({ value: 140, tone: "proceed" })),
    ).toContain("100");
    expect(
      renderToStaticMarkup(VerdictGauge({ value: -20, tone: "reconsider" })),
    ).toContain(">0<");
  });

  test("colours the arc from the decision tone", () => {
    expect(
      renderToStaticMarkup(VerdictGauge({ value: 80, tone: "proceed" })),
    ).toContain("var(--success)");
    expect(
      renderToStaticMarkup(VerdictGauge({ value: 20, tone: "reconsider" })),
    ).toContain("var(--destructive)");
  });
});
