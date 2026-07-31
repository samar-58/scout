"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ThemeChoice = "light" | "dark" | "system";

const STORAGE_KEY = "scout:theme";
const ORDER: ThemeChoice[] = ["light", "dark", "system"];
const ICON = { light: Sun, dark: Moon, system: Monitor };
const LABEL = { light: "Light", dark: "Dark", system: "System" };

function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = choice === "dark" || (choice === "system" && prefersDark);

  // Enable colour transitions only for a deliberate switch, so the initial
  // paint stays instant and the flip feels intentional.
  root.classList.add("theme-transition");
  root.classList.toggle("dark", isDark);
  window.setTimeout(() => root.classList.remove("theme-transition"), 240);
}

/**
 * One button that cycles light → dark → system.
 *
 * This was a three-segment radio group, which is a lot of chrome to spend on a
 * preference most people set once. A single control showing the *current* state
 * says the same thing in a third of the space, which is what let the theme
 * control move into the sidebar footer next to the account.
 */
export function ThemeToggle({
  className,
  compact = false,
}: {
  className?: string;
  /** Icon only, no label — used when the sidebar is collapsed. */
  compact?: boolean;
}) {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        setChoice(stored);
      }
    } catch {
      // Blocked storage — fall back to following the system.
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (choice === "system") applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [choice, mounted]);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length];
    setChoice(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Best-effort only.
    }
  }

  // Before hydration the icon is fixed, keeping server and client markup equal.
  const Icon = mounted ? ICON[choice] : Monitor;
  const label = mounted ? LABEL[choice] : "System";

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${label}`}
      aria-label={`Theme: ${label}. Click to change.`}
      className={cn(
        "grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        compact && "size-8",
        className,
      )}
    >
      <Icon size={14} strokeWidth={2} />
    </button>
  );
}
