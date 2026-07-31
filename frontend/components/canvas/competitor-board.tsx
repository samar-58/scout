"use client";

import { CanvasSection } from "@/components/canvas/canvas-section";
import type { ReportCompetitor } from "@/lib/report-types";

/**
 * The competitive landscape as a table.
 *
 * Competitors are the one thing on the canvas that genuinely wants to be
 * compared column by column — who they serve, what they charge, where they are
 * weak, and the opening that leaves. As cards with tinted footers that
 * comparison was impossible; as rows it is the default reading.
 */
export function CompetitorBoard({
  competitors,
}: {
  competitors?: ReportCompetitor[];
}) {
  const entries = (competitors ?? []).filter((competitor) =>
    competitor.name?.trim(),
  );
  if (entries.length === 0) return null;

  return (
    <CanvasSection
      id="competitors"
      eyebrow="Competitors"
      title="Who already owns this customer"
      description="Each row ends with the opening Scout thinks is left — that is where a wedge can exist."
    >
      <div className="scroll-touch -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[44rem] border-collapse text-left align-top">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="label w-[9rem] py-2 pr-4 font-normal">
                Competitor
              </th>
              <th scope="col" className="label py-2 pr-4 font-normal">
                Serves
              </th>
              <th scope="col" className="label py-2 pr-4 font-normal">
                Weakness
              </th>
              <th scope="col" className="label py-2 font-normal">
                Your opening
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((competitor, position) => (
              <tr
                key={`${competitor.name}-${position}`}
                className="border-b border-border align-top"
              >
                <th scope="row" className="py-3 pr-4 text-left font-normal">
                  <span className="block text-[13px] font-medium [overflow-wrap:anywhere]">
                    {competitor.name}
                  </span>
                  {competitor.pricing?.trim() && (
                    <span className="mt-0.5 block text-[12px] text-muted-foreground">
                      {competitor.pricing}
                    </span>
                  )}
                </th>
                <td className="py-3 pr-4 text-[12.5px] leading-relaxed text-muted-foreground">
                  {competitor.icp?.trim() || "—"}
                </td>
                <td className="py-3 pr-4 text-[12.5px] leading-relaxed text-muted-foreground">
                  {competitor.weakness?.trim() || "—"}
                </td>
                <td className="py-3 text-[12.5px] leading-relaxed text-foreground/85">
                  {competitor.opportunity?.trim() || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CanvasSection>
  );
}
