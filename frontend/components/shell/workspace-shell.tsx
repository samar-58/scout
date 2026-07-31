"use client";

import { PanelLeft } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "scout:sidebar-collapsed";

/*
 * The drawer trigger belongs in each view's own header (next to its title), not
 * in a second global bar. This context hands the open function down without
 * every page having to thread a prop.
 */
const MobileMenuContext = createContext<(() => void) | undefined>(undefined);

/**
 * Two-pane workspace: navigation on the left, work on the right.
 *
 * Desktop keeps the sidebar in the document flow (no overlay, no layout shift
 * when it collapses). Below `lg` it becomes a drawer over a scrim, opened from
 * the content header, because 260px of chrome on a phone is most of the screen.
 */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // Blocked storage — start expanded.
    }
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // Best-effort only.
      }
      return next;
    });
  }

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop rail */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 border-r border-border lg:block",
          collapsed ? "w-[52px]" : "w-[248px]",
        )}
      >
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-foreground/25 backdrop-blur-[2px] duration-200 animate-in fade-in"
          />
          <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r border-border shadow-lg duration-200 animate-in slide-in-from-left">
            <Sidebar
              collapsed={false}
              onToggleCollapsed={toggleCollapsed}
              onNavigate={() => setDrawerOpen(false)}
              showClose
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileMenuContext.Provider value={() => setDrawerOpen(true)}>
          {children}
        </MobileMenuContext.Provider>
      </div>
    </div>
  );
}

/*
 * The drawer trigger belongs in each view's own header (next to its title), not
 * in a second global bar. This context hands the open function down without
 * every page having to thread a prop.
 */

/** Renders the hamburger on small screens; nothing on desktop. */
export function SidebarTrigger({ className }: { className?: string }) {
  const open = useContext(MobileMenuContext);
  if (!open) return null;
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open navigation"
      className={cn(
        "-ml-1 grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden",
        className,
      )}
    >
      <PanelLeft size={16} />
    </button>
  );
}
