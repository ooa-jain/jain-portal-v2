"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Popover } from "radix-ui";
import {
  BarChart3, Bell, BellRing, FolderOpen, LineChart, ClipboardCheck, FileCheck2, Home, Inbox, Lightbulb, ListChecks, LogOut, Menu,
  PanelLeftClose, PieChart, Settings, ShieldCheck, Users, X, type LucideIcon,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { stopImpersonating } from "@/app/actions/admin";
import type { PortalNotification } from "@/lib/types";
import { cn, formatDateTime, initials } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  dashboard: Home, readiness: ClipboardCheck, closure: FileCheck2, iea: Lightbulb, analysis: BarChart3,
  ieaAnalysis: PieChart, admin: ShieldCheck, submissions: ListChecks, users: Users, requests: Inbox,
  notifications: BellRing, settings: Settings, documents: FolderOpen, analytics: LineChart,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS | string; badge?: number };
export type NavGroup = { title: string; items: NavItem[] };

export type ShellProps = {
  groups: NavGroup[];
  user: { name: string; email: string; department: string; isAdmin: boolean; isFaculty: boolean };
  impersonatedBy: string | null;
  notifications: PortalNotification[];
  /** Shown in the top bar after the portal name, e.g. "2026–27". */
  cycle: string;
  children: React.ReactNode;
};

function isActive(pathname: string, href: string, all: string[]) {
  if (href === "/") return pathname === "/";
  if (pathname !== href && !pathname.startsWith(`${href}/`)) return false;
  // Prefer the most specific matching link (e.g. /admin/users over /admin).
  return !all.some((other) => other.length > href.length && (pathname === other || pathname.startsWith(`${other}/`)));
}

const COLLAPSE_KEY = "ooa:side-collapsed";

function SideNav({
  groups,
  pathname,
  collapsed,
  onNavigate,
}: {
  groups: NavGroup[];
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 pb-3 pt-1" aria-label="Main">
      {groups.map((group, index) => (
        <div key={group.title} className={cn(index > 0 && "mt-2 border-t border-border pt-2")}>
          {!collapsed && index > 0 && (
            <p className="px-3 pb-1 pt-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#9aa3b2]">{group.title}</p>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const Icon = ICONS[item.icon] ?? Home;
              const active = isActive(pathname, item.href, hrefs);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-[9px] text-[13.5px] font-medium text-[#374151] transition-colors",
                      collapsed && "justify-center px-0",
                      active
                        ? "bg-white font-semibold text-primary shadow-[0_1px_2px_rgba(16,24,40,.06),0_0_0_1px_var(--border)] before:absolute before:-left-2.5 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r before:bg-primary"
                        : "hover:bg-hover hover:text-primary",
                    )}
                  >
                    <Icon className="size-5 shrink-0" strokeWidth={1.8} />
                    {!collapsed && (
                      <span className="min-w-0 flex-1 truncate transition-transform group-hover:translate-x-[3px]">{item.label}</span>
                    )}
                    {item.badge ? (
                      <span
                        className={cn(
                          "rounded-full bg-primary px-1.5 text-[11px] font-bold leading-5 text-white",
                          collapsed && "absolute right-1 top-0.5 px-1 text-[10px] leading-4",
                        )}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SideFoot({ user, collapsed }: { user: ShellProps["user"]; collapsed: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5 border-t border-border px-3.5 py-3", collapsed && "flex-col px-0")}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white">
        {initials(user.name)}
      </span>
      {!collapsed && (
        <span className="min-w-0 flex-1 leading-tight">
          <strong className="block truncate text-[13px] font-semibold text-primary">{user.name}</strong>
          <small className="block truncate text-[11.5px] text-[#5b6474]">
            {user.isAdmin ? "Office of Academic Affairs" : user.isFaculty ? `Faculty · ${user.department || user.email}` : user.department || user.email}
          </small>
        </span>
      )}
      <form action={signOut}>
        <button
          type="submit"
          title="Sign out"
          aria-label="Sign out"
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-hover hover:text-primary"
        >
          <LogOut className="size-[18px]" strokeWidth={1.8} />
        </button>
      </form>
    </div>
  );
}

const SEEN_KEY = "ooa:notifications-seen";

function NotificationBell({ notifications }: { notifications: PortalNotification[] }) {
  const latest = notifications[0]?.created_at ?? "";
  const [seen, setSeen] = useState<string | null>(null);
  useEffect(() => {
    // Read after mount: localStorage is not available during server rendering.
    let stored = "";
    try {
      stored = window.localStorage.getItem(SEEN_KEY) ?? "";
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeen(stored);
  }, []);
  const unread = seen === null ? 0 : notifications.filter((n) => n.created_at > seen).length;

  return (
    <Popover.Root
      onOpenChange={(open) => {
        if (open && latest) {
          try {
            window.localStorage.setItem(SEEN_KEY, latest);
          } catch {}
          setSeen(latest);
        }
      }}
    >
      <Popover.Trigger
        className="relative flex size-9 items-center justify-center rounded-full border bg-white text-[#475467] hover:bg-hover hover:text-primary"
        aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
      >
        <Bell className="size-[18px]" strokeWidth={1.8} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-[18px] text-white">
            {unread}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} className="z-50 w-80 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border bg-card shadow-lg">
          <p className="border-b px-4 py-3 text-[14px] font-bold text-primary">Updates</p>
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">No updates yet.</p>
          ) : (
            <ul className="max-h-96 divide-y overflow-y-auto">
              {notifications.map((n) => (
                <li key={n._id} className="px-4 py-3">
                  <p className="text-[13px] font-semibold text-primary">{n.title}</p>
                  <p className="mt-0.5 text-[13px] text-[#475467]">{n.body}</p>
                  <p className="mt-1 text-[11.5px] text-muted-foreground">{formatDateTime(n.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Registers the service worker and reports installs / launches of the installed app. */
function usePwa() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    const track = (event: string) =>
      fetch("/api/pwa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event }) }).catch(() => {});
    const onInstalled = () => track("install");
    window.addEventListener("appinstalled", onInstalled);
    try {
      if (window.matchMedia("(display-mode: standalone)").matches && !window.sessionStorage.getItem("ooa:launch")) {
        window.sessionStorage.setItem("ooa:launch", "1");
        track("launch");
      }
    } catch {}
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);
}

export function AppShell({ groups, user, impersonatedBy, notifications, cycle, children }: ShellProps) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  usePwa();

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);
  function toggleCollapsed() {
    setCollapsed((value) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, value ? "0" : "1");
      } catch {}
      return !value;
    });
  }

  const sideWidth = collapsed ? "lg:w-[68px]" : "lg:w-[248px]";
  const mainPad = collapsed ? "lg:pl-[68px]" : "lg:pl-[248px]";

  return (
    <div className="flex min-h-screen flex-1">
      {/* desktop menu */}
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-white/60 bg-white/55 backdrop-blur-xl transition-[width] duration-300 lg:flex", sideWidth)}>
        <div className={cn("flex min-h-16 items-center gap-2 px-4 pb-2.5 pt-3.5", collapsed && "flex-col px-0")}>
          <Link href="/" className="flex min-w-0 flex-1 items-center" aria-label="Jain OOA Portal home">
            {collapsed ? (
              <Image src="/brand/jgi-icon-192.png" alt="" width={34} height={34} className="mx-auto rounded-full" />
            ) : (
              <Image src="/brand/jain.png" alt="JAIN (Deemed-to-be University)" width={110} height={32} className="h-8 w-auto" priority />
            )}
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            className={cn("flex size-[34px] items-center justify-center rounded-lg text-muted-foreground transition-transform duration-300 hover:bg-hover hover:text-primary", collapsed && "rotate-180")}
          >
            <PanelLeftClose className="size-5" strokeWidth={1.8} />
          </button>
        </div>
        <SideNav groups={groups} pathname={pathname} collapsed={collapsed} />
        <SideFoot user={user} collapsed={collapsed} />
      </aside>

      {/* phone menu */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="flex h-[60px] items-center justify-between border-b px-4">
            <Image src="/brand/jain.png" alt="JAIN (Deemed-to-be University)" width={92} height={28} className="h-7 w-auto" />
            <button type="button" aria-label="Close menu" onClick={() => setDrawer(false)} className="flex size-10 items-center justify-center rounded-lg hover:bg-hover">
              <X className="size-5" />
            </button>
          </div>
          <SideNav groups={groups} pathname={pathname} collapsed={false} onNavigate={() => setDrawer(false)} />
          <SideFoot user={user} collapsed={false} />
        </div>
      )}

      <div className={cn("flex min-w-0 flex-1 flex-col transition-[padding] duration-300", mainPad)}>
        {/* phone bar */}
        <div className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b bg-white px-4 lg:hidden">
          <Link href="/" aria-label="Jain OOA Portal home">
            <Image src="/brand/jain.png" alt="JAIN (Deemed-to-be University)" width={92} height={28} className="h-7 w-auto" />
          </Link>
          <button type="button" aria-label="Open menu" onClick={() => setDrawer(true)} className="flex size-10 items-center justify-center rounded-lg text-[#374151] hover:bg-hover">
            <Menu className="size-5" />
          </button>
        </div>

        {/* institution bar */}
        <header className="sticky top-[60px] z-20 flex h-11 items-center gap-4 border-b border-white/70 bg-white/60 px-4 backdrop-blur-md sm:px-5 lg:top-0">
          <span className="hidden min-w-0 truncate text-[12.5px] text-muted-foreground md:block">
            JAIN (Deemed-to-be University) · Office of Academic Affairs
          </span>
          <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-primary md:mx-auto">
            Jain OOA Portal{cycle && <span className="hidden sm:inline"> | {cycle}</span>}
          </span>
          <span className="ml-auto md:ml-0">
            <NotificationBell notifications={notifications} />
          </span>
        </header>

        {impersonatedBy && (
          <form action={stopImpersonating} className="flex flex-wrap items-center justify-center gap-3 border-b border-[#f2cd73] bg-[#fdf6e3] px-4 py-2 text-[13px] text-[#7a5e05]">
            <span>
              You are viewing the portal as <strong>{user.name}</strong> ({user.email}). Changes you make are made as this user.
            </span>
            <button type="submit" className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-white">
              Return to admin
            </button>
          </form>
        )}

        <main className="flex-1 px-4 py-5 sm:px-6">
          <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
