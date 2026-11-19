"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Popover } from "radix-ui";
import {
  BarChart3, Bell, BellRing, FolderOpen, LineChart, ClipboardCheck, FileCheck2, Home, Inbox, Lightbulb, ListChecks, LogOut, UserRound,
  PieChart, Settings, ShieldCheck, Users, type LucideIcon,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { stopImpersonating } from "@/app/actions/admin";
import type { PortalNotification } from "@/lib/types";
import { formatDateTime, initials } from "@/lib/utils";
import { SidebarWithTabs, type NavItem as TabNavItem } from "@/components/ui/sidebar-with-chrome-like-tabs";
import { ThemeToggle } from "@/components/theme-toggle";

const ICONS: Record<string, LucideIcon> = {
  dashboard: Home, readiness: ClipboardCheck, closure: FileCheck2, iea: Lightbulb, analysis: BarChart3,
  ieaAnalysis: PieChart, admin: ShieldCheck, submissions: ListChecks, users: Users, requests: Inbox,
  notifications: BellRing, settings: Settings, documents: FolderOpen, analytics: LineChart, profile: UserRound,
};

/** `hidden` items are left out of the menu but still name the tab when their page is open. */
export type NavItem = { href: string; label: string; icon: keyof typeof ICONS | string; badge?: number; hidden?: boolean };
export type NavGroup = { title: string; items: NavItem[] };

export type ShellProps = {
  groups: NavGroup[];
  user: { name: string; email: string; department: string; isAdmin: boolean; isFaculty: boolean; isDemo?: boolean };
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
        className="relative flex size-9 items-center justify-center rounded-full border bg-card text-muted-foreground hover:bg-hover hover:text-foreground"
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
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{n.body}</p>
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
  const router = useRouter();
  usePwa();

  // The menu, flattened, with each group's title as the section heading.
  const navItems: TabNavItem[] = useMemo(
    () =>
      groups.flatMap((group, index) =>
        group.items.map((item) => ({
          id: item.href,
          label: item.label,
          icon: ICONS[item.icon] ?? Home,
          badge: item.badge,
          hidden: item.hidden,
          section: index > 0 ? group.title : undefined,
        })),
      ),
    [groups],
  );
  const hrefs = navItems.map((item) => item.id);
  const activeNavId = hrefs.find((href) => isActive(pathname, href, hrefs)) ?? "";

  const footer = (
    <div className="flex w-full items-center gap-2.5 rounded-xl bg-sidebar-accent px-2.5 py-2">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white">{initials(user.name)}</span>
      <span className="min-w-0 flex-1 leading-tight">
        <strong className="block truncate text-[13px] font-semibold text-primary">{user.name}</strong>
        <small className="block truncate text-[11.5px] text-muted-foreground">
          {user.isAdmin ? "Office of Academic Affairs" : user.isFaculty ? `Faculty · ${user.department || user.email}` : user.department || user.email}
        </small>
      </span>
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

  const banner = (
    <>
      {user.isDemo && (
        <div className="border-b border-border bg-accent-soft px-4 py-2 text-center text-[13px] text-muted-foreground">
          <strong className="text-foreground">Demo account</strong> for testing. Anything you save here is filed under the demo department, not a real one.
        </div>
      )}
      {impersonatedBy && (
        <form action={stopImpersonating} className="flex flex-wrap items-center justify-center gap-3 border-b border-warning/40 bg-warning-soft px-4 py-2 text-[13px] text-warning">
          <span>
            You are viewing the portal as <strong>{user.name}</strong> ({user.email}). Changes you make are made as this user.
          </span>
          <button type="submit" className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-white">
            Return to admin
          </button>
        </form>
      )}
    </>
  );

  return (
    <SidebarWithTabs
      logo={<Image src="/brand/jain-logo.png" alt="JAIN (Deemed-to-be University)" width={900} height={223} priority className="h-9 w-auto" />}
      collapsedLogo={<Image src="/brand/jgi-icon-192.png" alt="Jain OOA Portal" width={34} height={34} className="rounded-full" />}
      navItems={navItems}
      activeNavId={activeNavId}
      currentPath={pathname}
      onNavigate={(navId, path) => router.push(path ?? navId)}
      storageKey={`ooa:tabs:${user.email}`}
      footer={footer}
      banner={banner}
      toolbar={
        <>
          <span className="hidden whitespace-nowrap text-[12px] font-bold uppercase tracking-[0.06em] text-primary dark:text-foreground xl:inline">
            Jain OOA Portal <span className="ml-1 rounded-full bg-secondary px-2.5 py-0.5 text-[11.5px]">{cycle}</span>
          </span>
          <ThemeToggle />
          <NotificationBell notifications={notifications} />
          <span
            title={`${user.name} · ${user.email}`}
            className="hidden size-9 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground sm:flex"
          >
            {initials(user.name)}
          </span>
        </>
      }
    >
      <div className="px-4 py-5 sm:px-6">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">{children}</div>
      </div>
    </SidebarWithTabs>
  );
}
