"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu, Popover } from "radix-ui";
import {
  BarChart3, Bell, BellRing, ChevronDown, ChevronRight, ClipboardCheck, FileCheck2, Inbox, LayoutDashboard,
  Lightbulb, ListChecks, LogOut, Menu, PieChart, Settings, ShieldCheck, Users, X, type LucideIcon,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { stopImpersonating } from "@/app/actions/admin";
import type { PortalNotification } from "@/lib/types";
import { cn, formatDateTime, initials } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard, readiness: ClipboardCheck, closure: FileCheck2, iea: Lightbulb, analysis: BarChart3,
  ieaAnalysis: PieChart, admin: ShieldCheck, submissions: ListChecks, users: Users, requests: Inbox,
  notifications: BellRing, settings: Settings,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS | string; badge?: number };
export type NavGroup = { title: string; items: NavItem[] };

export type ShellProps = {
  groups: NavGroup[];
  user: { name: string; email: string; department: string; isAdmin: boolean };
  impersonatedBy: string | null;
  notifications: PortalNotification[];
  children: React.ReactNode;
};

function isActive(pathname: string, href: string, all: string[]) {
  if (href === "/") return pathname === "/";
  if (pathname !== href && !pathname.startsWith(`${href}/`)) return false;
  // Prefer the most specific matching link (e.g. /admin/users over /admin).
  return !all.some((other) => other.length > href.length && (pathname === other || pathname.startsWith(`${other}/`)));
}

function Sidebar({ groups, pathname, onNavigate }: { groups: NavGroup[]; pathname: string; onNavigate?: () => void }) {
  const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <Link href="/" onClick={onNavigate} className="flex h-14 shrink-0 items-center gap-2.5 border-b border-white/10 px-4">
        <Image src="/brand/jgi-icon-192.png" alt="" width={30} height={30} className="rounded bg-white" />
        <span className="leading-tight">
          <span className="block text-sm font-semibold text-white">Jain Sarathi</span>
          <span className="block text-[10px] uppercase tracking-[0.14em] text-sidebar-muted">Office of Academics</span>
        </span>
      </Link>
      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Main">
        {groups.map((group) => (
          <div key={group.title} className="mb-4">
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">{group.title}</p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon] ?? LayoutDashboard;
                const active = isActive(pathname, item.href, hrefs);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded border-l-[3px] px-2.5 py-2 text-[13px] font-medium transition-colors",
                        active
                          ? "border-accent bg-sidebar-active text-white"
                          : "border-transparent hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.badge ? (
                        <span className="rounded-sm bg-accent px-1.5 text-[11px] font-bold leading-5 text-accent-foreground">{item.badge}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <p className="border-t border-white/10 px-4 py-3 text-[11px] text-sidebar-muted">JAIN (Deemed-to-be University)</p>
    </div>
  );
}

function Breadcrumbs({ groups, pathname }: { groups: NavGroup[]; pathname: string }) {
  const items = groups.flatMap((g) => g.items);
  const hrefs = items.map((i) => i.href);
  const current = items.find((i) => isActive(pathname, i.href, hrefs));
  const group = current && groups.find((g) => g.items.includes(current));
  const deeper = current && pathname !== current.href;
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
      <span className="hidden sm:inline">{group?.title ?? "Portal"}</span>
      <ChevronRight className="hidden size-3.5 sm:inline" />
      {current ? (
        deeper ? (
          <Link href={current.href} className="truncate hover:text-foreground">{current.label}</Link>
        ) : (
          <span className="truncate font-semibold text-foreground">{current.label}</span>
        )
      ) : (
        <span className="font-semibold text-foreground">Page</span>
      )}
      {deeper && (
        <>
          <ChevronRight className="size-3.5 shrink-0" />
          <span className="truncate font-semibold text-foreground">
            {pathname.includes("/form") ? "Submission" : pathname.split("/").pop()?.replace(/-/g, " ")}
          </span>
        </>
      )}
    </nav>
  );
}

const SEEN_KEY = "sarathi:notifications-seen";

function NotificationBell({ notifications }: { notifications: PortalNotification[] }) {
  const latest = notifications[0]?.created_at ?? "";
  const [seen, setSeen] = useState<string | null>(null);
  useEffect(() => {
    // Read after mount: localStorage is not available during server rendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeen(window.localStorage.getItem(SEEN_KEY) ?? "");
  }, []);
  const unread = seen === null ? 0 : notifications.filter((n) => n.created_at > seen).length;

  return (
    <Popover.Root
      onOpenChange={(open) => {
        if (open && latest) {
          window.localStorage.setItem(SEEN_KEY, latest);
          setSeen(latest);
        }
      }}
    >
      <Popover.Trigger
        className="relative flex size-9 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
      >
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-white">
            {unread}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="z-50 w-80 max-w-[calc(100vw-1rem)] rounded-md border bg-card shadow-lg">
          <p className="border-b px-4 py-2.5 text-sm font-semibold text-primary">Notifications</p>
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">No notifications yet.</p>
          ) : (
            <ul className="max-h-96 divide-y overflow-y-auto">
              {notifications.map((n) => (
                <li key={n._id} className="px-4 py-3">
                  <p className="text-[13px] font-semibold">{n.title}</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(n.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function UserMenu({ user }: { user: ShellProps["user"] }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-muted" aria-label="Account menu">
        <span className="flex size-8 items-center justify-center rounded bg-primary text-xs font-semibold text-primary-foreground">
          {initials(user.name)}
        </span>
        <span className="hidden max-w-44 text-left leading-tight md:block">
          <span className="block truncate text-[13px] font-semibold">{user.name}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{user.isAdmin ? "Administrator" : user.department || "Department not set"}</span>
        </span>
        <ChevronDown className="hidden size-4 text-muted-foreground md:block" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="z-50 w-64 rounded-md border bg-card p-1 shadow-lg">
          <div className="border-b px-3 py-2.5">
            <p className="truncate text-[13px] font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            {user.department && <p className="mt-1 text-xs text-muted-foreground">{user.department}</p>}
          </div>
          <DropdownMenu.Item asChild>
            <Link href="/" className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-[13px] outline-none data-[highlighted]:bg-muted">
              <LayoutDashboard className="size-4" />
              Dashboard and profile
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-[13px] text-destructive outline-none data-[highlighted]:bg-destructive-soft"
            onSelect={() => signOut()}
          >
            <LogOut className="size-4" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
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
    if (window.matchMedia("(display-mode: standalone)").matches && !window.sessionStorage.getItem("sarathi:launch")) {
      window.sessionStorage.setItem("sarathi:launch", "1");
      track("launch");
    }
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);
}

export function AppShell({ groups, user, impersonatedBy, notifications, children }: ShellProps) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  usePwa();

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">
        <Sidebar groups={groups} pathname={pathname} />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-primary/50" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl">
            <Sidebar groups={groups} pathname={pathname} onNavigate={() => setDrawer(false)} />
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute -right-10 top-3 flex size-8 items-center justify-center rounded bg-card"
              onClick={() => setDrawer(false)}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        {impersonatedBy && (
          <form action={stopImpersonating} className="flex flex-wrap items-center justify-center gap-3 bg-accent px-4 py-1.5 text-[13px] font-medium text-accent-foreground">
            <span>
              You are viewing the portal as <strong>{user.name}</strong> ({user.email}). Changes you make are made as this user.
            </span>
            <button type="submit" className="rounded bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
              Return to admin
            </button>
          </form>
        )}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card px-3 sm:px-5">
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Open navigation"
            onClick={() => setDrawer(true)}
          >
            <Menu className="size-5" />
          </button>
          <Breadcrumbs groups={groups} pathname={pathname} />
          <div className="ml-auto flex items-center gap-1.5">
            <Image src="/brand/jain.png" alt="JAIN (Deemed-to-be University)" width={104} height={30} className="mr-2 hidden h-7 w-auto xl:block" />
            <NotificationBell notifications={notifications} />
            <UserMenu user={user} />
          </div>
        </header>
        <main className="flex-1 px-3 py-5 sm:px-5">
          <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
