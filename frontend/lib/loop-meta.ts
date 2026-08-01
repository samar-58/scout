import type {
  AssumptionStatusValue,
  ExperimentStatus,
} from "@/lib/scout-api";

/** One status vocabulary for the loop, shared by every board and the timeline. */
export const ASSUMPTION_STATUS_META: Record<
  AssumptionStatusValue,
  { label: string; dot: string; text: string }
> = {
  untested: { label: "Untested", dot: "bg-border-strong", text: "text-muted-foreground" },
  testing: { label: "Testing", dot: "bg-brand", text: "text-brand" },
  supported: { label: "Supported", dot: "bg-success", text: "text-success" },
  contradicted: { label: "Contradicted", dot: "bg-destructive", text: "text-destructive" },
  inconclusive: { label: "Inconclusive", dot: "bg-warning", text: "text-warning" },
};

export const EXPERIMENT_COLUMNS: {
  status: ExperimentStatus;
  label: string;
  hint: string;
}[] = [
  { status: "suggested", label: "Suggested", hint: "From the research report" },
  { status: "planned", label: "Planned", hint: "Ready to run" },
  { status: "running", label: "Running", hint: "In the field" },
  { status: "completed", label: "Completed", hint: "Reviewed" },
  { status: "abandoned", label: "Abandoned", hint: "Dropped" },
];

/** Which moves the API accepts, mirrored so the UI never offers an invalid one. */
export const EXPERIMENT_TRANSITIONS: Record<ExperimentStatus, ExperimentStatus[]> = {
  suggested: ["planned", "running", "abandoned"],
  planned: ["running", "abandoned"],
  running: ["completed", "abandoned"],
  completed: [],
  abandoned: ["planned"],
};

export const EXPERIMENT_ACTION_LABEL: Record<ExperimentStatus, string> = {
  suggested: "Move back to suggested",
  planned: "Plan",
  running: "Start",
  completed: "Complete",
  abandoned: "Abandon",
};

export const THESIS_FIELD_LABELS: { key: string; label: string }[] = [
  { key: "problem", label: "Problem" },
  { key: "customer", label: "Early adopter" },
  { key: "solution", label: "Solution" },
  { key: "alternatives", label: "Today's alternative" },
  { key: "pricing", label: "Pricing" },
  { key: "distribution", label: "Distribution" },
];

export const TIMELINE_KIND_LABELS: Record<string, string> = {
  run: "Research",
  report: "Report",
  experiment_started: "Experiment",
  experiment_completed: "Experiment",
  observation: "Evidence",
  decision: "Decision",
  thesis_version: "Thesis",
};

export function categoryLabel(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/** Mirror of scout/persistence/loop_materializer.py CATEGORY_KEYWORDS. */
const THESIS_FIELD_KEYWORDS: { field: string; keywords: string[] }[] = [
  {
    field: "pricing",
    keywords: [
      "pricing",
      "price",
      "willingness to pay",
      "wtp",
      "monetization",
      "monetisation",
    ],
  },
  {
    field: "distribution",
    keywords: [
      "distribution",
      "channel",
      "acquisition",
      "gtm",
      "go-to-market",
      "cac",
      "outbound",
    ],
  },
  {
    field: "customer",
    keywords: ["customer", "icp", "buyer", "segment", "adopter", "persona"],
  },
  {
    field: "problem",
    keywords: ["problem", "pain", "workflow", "frequency", "urgency"],
  },
  {
    field: "solution",
    keywords: ["solution", "product", "copilot", "feature", "mechanism"],
  },
  {
    field: "alternatives",
    keywords: ["alternative", "competitor", "incumbent", "status quo", "spreadsheet"],
  },
];

/** Map free text (claim, assumption) onto a thesis field key when possible. */
export function classifyThesisField(text: string): string | null {
  const haystack = text.toLowerCase();
  for (const entry of THESIS_FIELD_KEYWORDS) {
    if (entry.keywords.some((keyword) => haystack.includes(keyword))) {
      return entry.field;
    }
  }
  return null;
}
