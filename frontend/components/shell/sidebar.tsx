"use client";

import { Show, UserButton } from "@clerk/nextjs";
import {
  ChevronsLeft,
  ChevronsRight,
  LayoutList,
  Plus,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { ScoutMark } from "@/components/scout-logo";
import { useProjects } from "@/components/shell/projects-store";
import { ThemeToggle } from "@/components/theme-toggle";
import { filterProjects, groupProjectsByRecency } from "@/lib/project-groups";
import type { ProjectSummary } from "@/lib/scout-api";
import { statusMeta, TONE_DOT } from "@/lib/status-meta";
import { cn } from "@/lib/utils";

/**
 * The workspace sidebar: brand, one primary action, search, then every saved
 * project grouped by recency.
 *
 * Navigation used to live in a top bar, which meant the projects a founder had
 * already paid for were two clicks away on every screen. Here they are the
 * permanent left edge of the app, and the right side is always the work.
 *
 * Collapsed mode keeps the rail (brand, new run, list, account) at icon width
 * rather than hiding it, so the layout never shifts between modes.
 */
export function Sidebar({
  collapsed,
  onToggleCollapsed,
  onNavigate,
  showClose,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Called after any navigation, so the mobile drawer can close itself. */
  onNavigate?: () => void;
  showClose?: boolean;
}) {
  const pathname = usePathname();
  const { projects, loading } = useProjects();
  const [query, setQuery] = useState("");

  const groups = useMemo(
    () => groupProjectsByRecency(filterProjects(projects, query)),
    [projects, query],
  );

  const composerActive = pathname === "/app";
  const listActive = pathname === "/projects";

  return (
    <div className="flex h-full flex-col bg-surface-sunken">
      {/* Brand + collapse */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-2 px-3",
          collapsed && "justify-center px-0",
        )}
      >
        <Link
          href="/"
          aria-label="Scout home"
          className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-foreground text-background">
            <ScoutMark size={15} />
          </span>
          {!collapsed && (
            <span className="font-serif text-[15px] font-semibold">Scout</span>
          )}
        </Link>

        {!collapsed && <div className="flex-1" />}

        {!collapsed && showClose && (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Close navigation"
            className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          >
            <X size={15} />
          </button>
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Collapse sidebar"
            className="hidden size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:grid"
          >
            <ChevronsLeft size={15} />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Expand sidebar"
          className="mx-auto mb-1 grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronsRight size={15} />
        </button>
      )}

      {/* Primary action + navigation */}
      <nav className={cn("shrink-0 space-y-0.5", collapsed ? "px-2" : "px-2.5")}>
        <NavRow
          href="/app"
          icon={Plus}
          label="New research"
          active={composerActive}
          collapsed={collapsed}
          onNavigate={onNavigate}
          emphasis
        />
        <NavRow
          href="/projects"
          icon={LayoutList}
          label="All projects"
          active={listActive}
          collapsed={collapsed}
          onNavigate={onNavigate}
          trailing={
            projects.length > 0 ? (
              <span className="text-xs tabular-nums text-subtle-foreground">
                {projects.length}
              </span>
            ) : undefined
          }
        />
      </nav>

      {!collapsed && (
        <div className="mt-3 px-2.5">
          <div className="relative">
            <Search
              size={13}
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-subtle-foreground"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects"
              aria-label="Search projects"
              className="h-8 w-full rounded-md border border-transparent bg-muted pl-7.5 text-[13px] text-foreground placeholder:text-subtle-foreground focus:border-border-strong focus:bg-card focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Project list */}
      <div className="scroll-touch mt-3 min-h-0 flex-1 overflow-y-auto pb-3">
        {collapsed ? (
          <ul className="space-y-0.5 px-2">
            {projects.slice(0, 12).map((project) => (
              <li key={project.id}>
                <ProjectRow
                  project={project}
                  active={pathname === `/projects/${project.id}`}
                  collapsed
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        ) : loading ? (
          <div className="space-y-1.5 px-4 pt-2">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="h-4 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <p className="px-4 pt-2 text-[13px] leading-relaxed text-muted-foreground">
            No saved projects yet. Your first run creates one.
          </p>
        ) : groups.length === 0 ? (
          <p className="px-4 pt-2 text-[13px] text-muted-foreground">
            Nothing matches “{query}”.
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.key} className="mt-3 first:mt-0">
              <h2 className="label px-4 pb-1.5">{group.label}</h2>
              <ul className="space-y-px px-2.5">
                {group.projects.map((project) => (
                  <li key={project.id}>
                    <ProjectRow
                      project={project}
                      active={pathname === `/projects/${project.id}`}
                      onNavigate={onNavigate}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      {/* Account */}
      <div
        className={cn(
          "flex shrink-0 items-center gap-2 border-t border-border p-2.5 pb-safe",
          collapsed && "flex-col gap-2",
        )}
      >
        <Show when="signed-in">
          <UserButton
            appearance={{
              elements: {
                rootBox: "shrink-0",
                userButtonTrigger: "rounded-md",
                avatarBox: "h-7 w-7",
              },
            }}
            showName={!collapsed}
          />
        </Show>
        {!collapsed && <div className="flex-1" />}
        <ThemeToggle compact={collapsed} />
      </div>
    </div>
  );
}

function NavRow({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
  emphasis,
  trailing,
  onNavigate,
}: {
  href: string;
  icon: typeof Plus;
  label: string;
  active: boolean;
  collapsed: boolean;
  emphasis?: boolean;
  trailing?: React.ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "flex h-8 items-center gap-2.5 rounded-md text-[13px] transition-colors",
        collapsed ? "justify-center px-0" : "px-2.5",
        active
          ? "bg-card font-medium text-foreground shadow-xs"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        emphasis && !active && "text-foreground",
      )}
    >
      <Icon size={15} strokeWidth={2} className="shrink-0" />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && trailing}
    </Link>
  );
}

function ProjectRow({
  project,
  active,
  collapsed,
  onNavigate,
}: {
  project: ProjectSummary;
  active: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const meta = statusMeta(project.latest_run_status);
  // A dot for anything unfinished; a completed project needs no ornament.
  const showDot = project.latest_run_status !== "completed";

  if (collapsed) {
    return (
      <Link
        href={`/projects/${project.id}`}
        onClick={onNavigate}
        title={project.name}
        aria-current={active ? "page" : undefined}
        className={cn(
          "grid h-8 place-items-center rounded-md text-[11px] font-medium transition-colors",
          active
            ? "bg-card text-foreground shadow-xs"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {project.overall_score != null ? (
          <span className="tabular-nums">{Math.round(project.overall_score)}</span>
        ) : (
          <span className={cn("size-1.5 rounded-full", TONE_DOT[meta.tone])} />
        )}
      </Link>
    );
  }

  return (
    <Link
      href={`/projects/${project.id}`}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-8 items-center gap-2 rounded-md px-2.5 transition-colors",
        active
          ? "bg-card text-foreground shadow-xs"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {showDot && (
        <span
          aria-hidden
          className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[meta.tone])}
        />
      )}
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[13px]",
          active && "font-medium",
          !showDot && "pl-3.5",
        )}
      >
        {project.name}
      </span>
      {project.overall_score != null && (
        <span
          className="shrink-0 text-[11px] tabular-nums text-subtle-foreground"
          title={`Overall score ${Math.round(project.overall_score)}`}
        >
          {Math.round(project.overall_score)}
        </span>
      )}
    </Link>
  );
}
