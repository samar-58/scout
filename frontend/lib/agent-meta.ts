import {
  Crosshair,
  Microscope,
  Route,
  Scale,
  Shield,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface AgentMeta {
  id: string;
  label: string;
  icon: LucideIcon;
  blurb: string;
  /** Tailwind classes for the icon chip (unified monochrome). */
  chip: string;
  /** Tailwind text color for accents. */
  text: string;
  /** Tailwind bar/fill background for finding bullets. */
  fill: string;
}

/**
 * Unified, monochrome chip treatment. Agents are distinguished by their icon
 * and label, not by a rainbow of colors — this keeps the UI calm and editorial
 * rather than toyish.
 */
const CHIP = "bg-foreground/[0.05] text-foreground dark:bg-foreground/10";
const TEXT = "text-foreground";
const FILL = "bg-brand";

export const AGENT_META: Record<string, AgentMeta> = {
  market_analyst: {
    id: "market_analyst",
    label: "Market Analyst",
    icon: TrendingUp,
    blurb: "Sizes the market, growth, and why-now timing from live evidence.",
    chip: CHIP,
    text: TEXT,
    fill: FILL,
  },
  competitor_analyst: {
    id: "competitor_analyst",
    label: "Competitor Analyst",
    icon: Crosshair,
    blurb: "Maps incumbents, pricing, positioning, and the opening to exploit.",
    chip: CHIP,
    text: TEXT,
    fill: FILL,
  },
  customer_analyst: {
    id: "customer_analyst",
    label: "Customer Analyst",
    icon: Users,
    blurb: "Extracts real pain, switching triggers, and current workarounds.",
    chip: CHIP,
    text: TEXT,
    fill: FILL,
  },
  gtm_agent: {
    id: "gtm_agent",
    label: "GTM Agent",
    icon: Route,
    blurb: "Designs a first-customer and first-100 acquisition motion.",
    chip: CHIP,
    text: TEXT,
    fill: FILL,
  },
  vc_partner: {
    id: "vc_partner",
    label: "VC Partner",
    icon: Scale,
    blurb: "Asks the skeptical questions an investor will ask on day one.",
    chip: CHIP,
    text: TEXT,
    fill: FILL,
  },
  moat_agent: {
    id: "moat_agent",
    label: "Moat Agent",
    icon: Shield,
    blurb: "Judges realistic defensibility for the first 12–24 months.",
    chip: CHIP,
    text: TEXT,
    fill: FILL,
  },
  experiment_agent: {
    id: "experiment_agent",
    label: "Experiment Agent",
    icon: Microscope,
    blurb: "Turns your biggest risks into fast, cheap validation tests.",
    chip: CHIP,
    text: TEXT,
    fill: FILL,
  },
};

export const AGENT_ORDER = [
  "market_analyst",
  "competitor_analyst",
  "customer_analyst",
  "gtm_agent",
  "vc_partner",
  "moat_agent",
  "experiment_agent",
];

export const AGENT_LIST = AGENT_ORDER.map((id) => AGENT_META[id]);

/** Fallback for any agent id not in the map. */
export function agentMeta(id: string): AgentMeta {
  return (
    AGENT_META[id] ?? {
      id,
      label: id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      icon: Crosshair,
      blurb: "",
      chip: CHIP,
      text: TEXT,
      fill: FILL,
    }
  );
}
