"use client";

import React, { useState, useRef, useCallback, useMemo, useContext, createContext, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { X, Plus, PanelLeft, Menu, type LucideIcon, MoreHorizontal, ChevronRight, ChevronLeft, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

/** A navigation item in the sidebar. */
export interface NavItem {
  /** Unique identifier. In route mode this is the page's path, e.g. "/admin/users". */
  id: string;
  /** Label text to display */
  label: string;
  /** Icon component to render */
  icon: LucideIcon;
  /** Optional heading of the group this item starts or belongs to. */
  section?: string;
  /** Optional count shown as a badge (e.g. open requests). */
  badge?: number;
  /** Left out of the sidebar and quick-open list, but still names a tab showing it. */
  hidden?: boolean;
}

/** A single browser-like tab. */
export interface Tab {
  /** Unique identifier for the tab */
  id: string;
  /** ID of the active navigation item within this tab */
  activeNavId: string;
  /** Route mode: the exact page this tab shows (may be deeper than the nav item). */
  path?: string;
}

/** Props for the main SidebarWithTabs component. */
export interface SidebarWithTabsProps {
  /** Optional custom logo component */
  logo?: React.ReactNode;
  /** Small logo for the collapsed sidebar; defaults to `logo`. */
  collapsedLogo?: React.ReactNode;
  /** Name of the company/application (hidden when empty). */
  companyName?: string;
  /** List of navigation items */
  navItems: NavItem[];
  /** Renders content for the active nav item (in-page mode). */
  renderContent?: (navId: string) => React.ReactNode;
  /** Route mode: the page content, rendered as-is. */
  children?: React.ReactNode;
  /** ID of the default active navigation item */
  defaultNavId?: string;
  /** Optional footer content (e.g. user profile) */
  footer?: React.ReactNode;
  /** Optional controls at the right end of the tab strip (e.g. a notifications bell). */
  toolbar?: React.ReactNode;
  /** Optional notice shown above the content (e.g. "Demo account"). */
  banner?: React.ReactNode;
  /**
   * Route mode. `activeNavId` / `currentPath` describe the page being shown,
   * and `onNavigate` is called when a tab or nav item asks for another page.
   */
  activeNavId?: string;
  currentPath?: string;
  onNavigate?: (navId: string, path?: string) => void;
  /** localStorage key for the tabs (and collapsed state). Use a per-user key. */
  storageKey?: string;
}

interface TabsContextValue {
  tabs: Tab[];
  activeTabId: string;
  activeNavId: string;
  setActiveNav: (navId: string) => void;
  addTab: (navId?: string) => void;
  closeTab: (tabId: string) => void;
  closeOthers: (tabId: string) => void;
  closeToRight: (tabId: string) => void;
  closeToLeft: (tabId: string) => void;
  closeAll: () => void;
  setActiveTab: (tabId: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

/** Access the tab state. Must be used within SidebarWithTabs. */
export function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("useTabs must be used within SidebarWithTabs");
  }
  return context;
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}

/** Individual tab, with keyboard support and animation. */
function ChromeTab({
  tab,
  isActive,
  isLast,
  canClose,
  navItems,
  hasRightNeighborActive,
  onTabClick,
  onTabClose,
  onCloseOthers,
  onCloseToRight,
  onCloseToLeft,
  hasOtherTabs,
  hasTabsToRight,
  hasTabsToLeft,
}: {
  tab: Tab;
  isActive: boolean;
  isLast: boolean;
  canClose: boolean;
  navItems: NavItem[];
  hasRightNeighborActive: boolean;
  onTabClick: () => void;
  onTabClose: () => void;
  onCloseOthers: () => void;
  onCloseToRight: () => void;
  onCloseToLeft: () => void;
  hasOtherTabs: boolean;
  hasTabsToRight: boolean;
  hasTabsToLeft: boolean;
}) {
  const nav = navItems.find((n) => n.id === tab.activeNavId);
  const Icon = nav?.icon;
  const label = nav?.label || "New Tab";
  const tabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !tabRef.current) return;
    tabRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    if (!isLast) return;
    const timer = setTimeout(() => {
      tabRef.current?.closest(".tab-strip")?.querySelector(".new-tab-btn")?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }, 250);
    return () => clearTimeout(timer);
  }, [isActive, isLast]);

  const handleAuxClick = (e: React.MouseEvent) => {
    if (e.button === 1 && canClose) {
      e.preventDefault();
      onTabClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onTabClick();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      if (canClose) {
        e.preventDefault();
        onTabClose();
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      ((e.target as HTMLElement).closest("li")?.nextElementSibling?.querySelector('[role="tab"]') as HTMLElement | null)?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      ((e.target as HTMLElement).closest("li")?.previousElementSibling?.querySelector('[role="tab"]') as HTMLElement | null)?.focus();
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="tab"
          aria-selected={isActive}
          tabIndex={isActive ? 0 : -1}
          className={cn(
            "relative ml-[10px] flex min-w-[140px] max-w-[220px] cursor-pointer items-center gap-2 px-4 py-2.5 text-sm outline-none transition-colors duration-150 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar sm:ml-0",
            isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
          onClick={onTabClick}
          onAuxClick={handleAuxClick}
          onKeyDown={handleKeyDown}
          ref={tabRef}
        >
          {isActive && (
            <motion.div className="absolute inset-0 rounded-t-xl bg-background" layoutId="activeTabBg" transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}>
              <div className="absolute -left-3 bottom-0 h-3 w-3 overflow-hidden">
                <div className="absolute bottom-0 right-0 z-[1] h-6 w-6 rounded-full bg-topbar" />
                <div className="absolute inset-0 bg-background" />
              </div>
              <div className="absolute -right-3 bottom-0 h-3 w-3 overflow-hidden">
                <div className="absolute bottom-0 left-0 z-[1] h-6 w-6 rounded-full bg-topbar" />
                <div className="absolute inset-0 bg-background" />
              </div>
            </motion.div>
          )}

          <div className="relative flex min-w-0 flex-1 items-center gap-2">
            {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
            <span className="flex-1 select-none truncate font-medium">{label}</span>
            {canClose && (
              <button
                type="button"
                aria-label={`Close ${label} tab`}
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose();
                }}
                className={cn(
                  "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-colors",
                  isActive
                    ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                    : "text-muted-foreground opacity-0 hover:bg-sidebar-accent hover:text-sidebar-foreground group-hover:opacity-100 focus-visible:opacity-100",
                )}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {!isActive && !hasRightNeighborActive && <div className="absolute right-0 top-1/2 h-4 w-[1px] -translate-y-1/2 bg-sidebar-border" />}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onClick={onTabClose} disabled={!canClose}>
          Close Tab
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onCloseOthers} disabled={!hasOtherTabs}>
          Close Other Tabs
        </ContextMenuItem>
        <ContextMenuItem onClick={onCloseToRight} disabled={!hasTabsToRight}>
          <ChevronRight />
          Close Tabs to the Right
        </ContextMenuItem>
        <ContextMenuItem onClick={onCloseToLeft} disabled={!hasTabsToLeft}>
          <ChevronLeft />
          Close Tabs to the Left
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

/** Navigation list, with optional section headings and badges. */
function SidebarNavigation({
  navItems,
  activeNavId,
  isCollapsed,
  onItemClick,
}: {
  navItems: NavItem[];
  activeNavId: string;
  isCollapsed: boolean;
  onItemClick: (item: NavItem) => void;
}) {
  return (
    <nav className="space-y-1 px-3" aria-label="Main">
      {navItems.map((item, index) => {
        const isActive = item.id === activeNavId;
        const startsSection = item.section && item.section !== navItems[index - 1]?.section;
        const NavButton = (
          <button
            type="button"
            onClick={() => onItemClick(item)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150",
              isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isCollapsed && "justify-center px-0",
            )}
          >
            <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-sidebar-accent-foreground" : "text-muted-foreground")} />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="flex-1 truncate text-sm font-medium"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
            {item.badge ? (
              <span
                className={cn(
                  "rounded-full bg-sidebar-primary px-1.5 text-[11px] font-bold leading-5 text-sidebar-primary-foreground",
                  isCollapsed && "absolute right-0.5 top-0.5 px-1 text-[10px] leading-4",
                )}
              >
                {item.badge}
              </span>
            ) : null}
            {isActive && !isCollapsed && (
              <motion.div
                layoutId="activeNavIndicator"
                className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        );

        return (
          <React.Fragment key={item.id}>
            {startsSection &&
              (isCollapsed ? (
                <div className="mx-2 my-2 border-t border-sidebar-border" />
              ) : (
                <p className="px-3 pb-1 pt-4 text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{item.section}</p>
              ))}
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>{NavButton}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            ) : (
              NavButton
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

function MobileSidebar({
  logo,
  companyName,
  navItems,
  activeNavId,
  footer,
  onItemClick,
}: {
  logo?: React.ReactNode;
  companyName: string;
  navItems: NavItem[];
  activeNavId: string;
  footer?: React.ReactNode;
  onItemClick: (item: NavItem) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu" className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 border-r-0 p-0">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <div className="flex h-full flex-col bg-sidebar">
          <div className="flex items-center gap-3 border-b border-sidebar-border p-5">
            {logo}
            {companyName && <span className="text-base font-bold text-sidebar-foreground">{companyName}</span>}
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            <SidebarNavigation
              navItems={navItems}
              activeNavId={activeNavId}
              isCollapsed={false}
              onItemClick={(item) => {
                onItemClick(item);
                setOpen(false);
              }}
            />
          </div>
          {footer && <div className="border-t border-sidebar-border p-4">{footer}</div>}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Adds a tab on click; hover (or long-press on touch) opens a quick-open list. */
function NewTabButton({ navItems, onAddTab }: { navItems: NavItem[]; onAddTab: (navId?: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const lastTouchTime = useRef(0);

  const handleTouchStart = () => {
    lastTouchTime.current = Date.now();
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      setIsOpen(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const isTouch = Date.now() - lastTouchTime.current < 1000;
    if (isTouch && isLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setIsOpen(false);
    onAddTab();
  };

  return (
    <HoverCard
      open={isOpen}
      onOpenChange={(open) => {
        // On touch, only a confirmed long press opens the list.
        const isTouch = Date.now() - lastTouchTime.current < 1000;
        if (open && isTouch && !isLongPress.current) return;
        setIsOpen(open);
      }}
      openDelay={200}
      closeDelay={100}
    >
      <HoverCardTrigger asChild>
        <button
          type="button"
          aria-label="New tab"
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="new-tab-btn mb-0.5 ml-1 flex h-9 w-9 flex-shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="max-h-[70vh] w-56 overflow-y-auto p-1" sideOffset={8}>
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Quick Open</div>
        {navItems.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => {
              setIsOpen(false);
              onAddTab(item.id);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent"
          >
            <item.icon className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </HoverCardContent>
    </HoverCard>
  );
}

/** Sidebar plus browser-like tabs. Works in-page (renderContent) or with routes (onNavigate). */
export function SidebarWithTabs({
  logo,
  collapsedLogo,
  companyName = "",
  navItems,
  renderContent,
  children,
  defaultNavId,
  footer,
  toolbar,
  banner,
  activeNavId: routeNavId,
  currentPath,
  onNavigate,
  storageKey = "sidebar-tabs-state",
}: SidebarWithTabsProps) {
  const routeMode = Boolean(onNavigate);
  const defaultNav = routeNavId || defaultNavId || navItems[0]?.id || "";
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState("");
  const [isClient, setIsClient] = useState(false);
  const tabCounterRef = useRef(1);
  // Route mode: the page we asked the router for, until it has loaded.
  const pendingRef = useRef<{ navId: string; at: number } | null>(null);

  // Restore saved tabs (and the collapsed sidebar) after mount: localStorage
  // does not exist during server rendering, so this cannot be initial state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const first: Tab = { id: "tab-1", activeNavId: defaultNav, path: currentPath };
    let restored = false;
    const saved = readStorage(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { tabs: Tab[]; activeTabId: string };
        const known = new Set(navItems.map((n) => n.id));
        const valid = Array.isArray(parsed.tabs) ? parsed.tabs.filter((t) => t && typeof t.id === "string" && known.has(t.activeNavId)) : [];
        if (valid.length) {
          setTabs(valid);
          // Prefer the tab already showing this page, so a refresh lands on the right tab.
          const showing = routeNavId ? valid.find((t) => t.path === currentPath) ?? valid.find((t) => t.activeNavId === routeNavId) : undefined;
          const savedActive = valid.find((t) => t.id === parsed.activeTabId);
          setActiveTabId((showing ?? savedActive ?? valid[0]).id);
          tabCounterRef.current = valid.reduce((max, t) => {
            const match = t.id.match(/tab-(\d+)/);
            return match ? Math.max(max, Number(match[1])) : max;
          }, 1);
          restored = true;
        }
      } catch {}
    }
    if (!restored) {
      setTabs([first]);
      setActiveTabId(first.id);
    }
    setIsCollapsed(readStorage(`${storageKey}:collapsed`) === "1");
    setIsClient(true);
    // Only on mount: later route changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Route mode: the page being shown always belongs to the active tab.
  useEffect(() => {
    if (!routeMode || !isClient || !routeNavId) return;
    // While a tab switch is loading its page, the old page is still showing; wait for the new one
    // (or give up after a few seconds, e.g. when the page redirected elsewhere).
    const pending = pendingRef.current;
    if (pending) {
      if (pending.navId !== routeNavId && Date.now() - pending.at < 4000) return;
      pendingRef.current = null;
    }
    setTabs((prev) => {
      const current = prev.find((t) => t.id === activeTabId);
      if (!current) return prev;
      if (current.activeNavId === routeNavId && current.path === currentPath) return prev;
      return prev.map((t) => (t.id === activeTabId ? { ...t, activeNavId: routeNavId, path: currentPath } : t));
    });
  }, [routeMode, isClient, routeNavId, currentPath, activeTabId]);

  // Save tabs as they change (small, so no need to debounce; a refresh right after a change keeps it).
  useEffect(() => {
    if (!isClient || tabs.length === 0) return;
    writeStorage(storageKey, JSON.stringify({ tabs, activeTabId }));
  }, [tabs, activeTabId, isClient, storageKey]);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeNavId = routeMode ? routeNavId || activeTab?.activeNavId || defaultNav : activeTab?.activeNavId || defaultNav;

  const show = useCallback(
    (tab: Tab | undefined) => {
      if (!tab || !onNavigate) return;
      pendingRef.current = { navId: tab.activeNavId, at: Date.now() };
      onNavigate(tab.activeNavId, tab.path);
    },
    [onNavigate],
  );

  const setActiveNav = useCallback(
    (navId: string) => {
      setTabs((prev) => prev.map((tab) => (tab.id === activeTabId ? { ...tab, activeNavId: navId, path: undefined } : tab)));
      if (onNavigate) {
        pendingRef.current = { navId, at: Date.now() };
        onNavigate(navId);
      }
    },
    [activeTabId, onNavigate],
  );

  const addTab = useCallback(
    (navId?: string) => {
      tabCounterRef.current += 1;
      const newTab: Tab = { id: `tab-${tabCounterRef.current}-${Date.now()}`, activeNavId: navId || defaultNavId || navItems[0]?.id || "" };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
      show(newTab);
    },
    [defaultNavId, navItems, show],
  );

  const closeTab = useCallback(
    (tabId: string) => {
      if (tabs.length === 1) return;
      const tabIndex = tabs.findIndex((t) => t.id === tabId);
      const newTabs = tabs.filter((t) => t.id !== tabId);
      setTabs(newTabs);
      if (activeTabId === tabId) {
        // Select the tab to the right if there is one, otherwise the one to the left.
        const next = newTabs[Math.max(0, tabIndex === newTabs.length ? tabIndex - 1 : tabIndex)];
        if (next) {
          setActiveTabId(next.id);
          show(next);
        }
      }
    },
    [tabs, activeTabId, show],
  );

  const keepOnly = useCallback(
    (newTabs: Tab[], fallbackId: string) => {
      setTabs(newTabs);
      if (!newTabs.some((t) => t.id === activeTabId)) {
        setActiveTabId(fallbackId);
        show(newTabs.find((t) => t.id === fallbackId));
      }
    },
    [activeTabId, show],
  );

  const closeOthers = useCallback((tabId: string) => keepOnly(tabs.filter((t) => t.id === tabId), tabId), [tabs, keepOnly]);
  const closeToRight = useCallback((tabId: string) => keepOnly(tabs.slice(0, tabs.findIndex((t) => t.id === tabId) + 1), tabId), [tabs, keepOnly]);
  const closeToLeft = useCallback((tabId: string) => keepOnly(tabs.slice(tabs.findIndex((t) => t.id === tabId)), tabId), [tabs, keepOnly]);
  const closeAll = useCallback(() => {
    if (tabs.length > 1) keepOnly([tabs[0]], tabs[0].id);
  }, [tabs, keepOnly]);

  const setActiveTab = useCallback(
    (tabId: string) => {
      setActiveTabId(tabId);
      if (tabId !== activeTabId) show(tabs.find((t) => t.id === tabId));
    },
    [activeTabId, tabs, show],
  );

  const toggleCollapsed = () =>
    setIsCollapsed((value) => {
      writeStorage(`${storageKey}:collapsed`, value ? "0" : "1");
      return !value;
    });

  const handleNavItemClick = useCallback((item: NavItem) => setActiveNav(item.id), [setActiveNav]);

  const contextValue = useMemo(
    () => ({ tabs, activeTabId, activeNavId, setActiveNav, addTab, closeTab, closeOthers, closeToRight, closeToLeft, closeAll, setActiveTab }),
    [tabs, activeTabId, activeNavId, setActiveNav, addTab, closeTab, closeOthers, closeToRight, closeToLeft, closeAll, setActiveTab],
  );

  const canCloseTab = tabs.length > 1;
  const hasOtherTabs = tabs.length > 1;
  const content = renderContent ? renderContent(activeNavId) : children;
  const menuItems = useMemo(() => navItems.filter((item) => !item.hidden), [navItems]);

  return (
    <TooltipProvider delayDuration={0}>
      <TabsContext.Provider value={contextValue}>
        <div className="flex h-[100dvh] w-full overflow-hidden bg-sidebar">
          <motion.aside
            initial={false}
            animate={{ width: isCollapsed ? 68 : 248 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="hidden flex-col overflow-hidden border-r border-sidebar-border bg-sidebar md:flex"
          >
            <div className="flex h-full flex-col overflow-hidden">
              <div className={cn("flex h-[60px] items-center border-b border-sidebar-border px-4", isCollapsed ? "justify-center" : "justify-between")}>
                <div className="flex min-w-0 items-center gap-3">
                  {isCollapsed ? collapsedLogo ?? logo : logo}
                  <AnimatePresence>
                    {!isCollapsed && companyName && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="truncate whitespace-nowrap text-sm font-bold tracking-tight text-sidebar-foreground"
                      >
                        {companyName}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                {!isCollapsed && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Collapse menu"
                    onClick={toggleCollapsed}
                    className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  >
                    <PanelLeft className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {isCollapsed && (
                <div className="flex justify-center border-b border-sidebar-border py-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Expand menu"
                    onClick={toggleCollapsed}
                    className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  >
                    <PanelLeft className="h-4 w-4 rotate-180" />
                  </Button>
                </div>
              )}

              <div className="scrollbar-hide flex-1 overflow-y-auto py-3">
                <SidebarNavigation navItems={menuItems} activeNavId={activeNavId} isCollapsed={isCollapsed} onItemClick={handleNavItemClick} />
              </div>

              <div className="flex min-h-[73px] items-center justify-center overflow-hidden border-t border-sidebar-border p-3">
                <AnimatePresence mode="wait">
                  {!isCollapsed ? (
                    footer ? (
                      <motion.div
                        key="expanded"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="w-full"
                      >
                        {footer}
                      </motion.div>
                    ) : null
                  ) : (
                    <motion.div
                      key="collapsed"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="flex justify-center"
                    >
                      {collapsedLogo ?? <div className="h-8 w-8 flex-shrink-0 rounded-full bg-muted" />}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.aside>

          <div className="relative flex flex-1 flex-col overflow-hidden">
            <div className="flex items-end bg-topbar pt-2 shadow-[inset_0_-1px_0_var(--sidebar-border)]">
              <div className="ml-2 flex-shrink-0 self-center md:hidden">
                <MobileSidebar
                  logo={logo}
                  companyName={companyName}
                  navItems={menuItems}
                  activeNavId={activeNavId}
                  footer={footer}
                  onItemClick={handleNavItemClick}
                />
              </div>

              <div className="tab-strip scrollbar-hide flex flex-1 items-end overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                <Reorder.Group as="ol" axis="x" values={tabs} onReorder={setTabs} className="flex items-end" role="tablist" aria-label="Open pages">
                  <AnimatePresence initial={false}>
                    {tabs.map((tab, index) => {
                      const isActive = tab.id === activeTabId;
                      return (
                        <Reorder.Item
                          value={tab}
                          as="li"
                          layout
                          key={tab.id}
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          whileDrag={{ cursor: "grabbing" }}
                          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                          className="group relative flex-shrink-0"
                          style={{ zIndex: isActive ? 10 : 1 }}
                        >
                          <ChromeTab
                            tab={tab}
                            isActive={isActive}
                            isLast={index === tabs.length - 1}
                            canClose={canCloseTab}
                            navItems={navItems}
                            hasRightNeighborActive={index < tabs.length - 1 && tabs[index + 1].id === activeTabId}
                            onTabClick={() => setActiveTab(tab.id)}
                            onTabClose={() => closeTab(tab.id)}
                            onCloseOthers={() => closeOthers(tab.id)}
                            onCloseToRight={() => closeToRight(tab.id)}
                            onCloseToLeft={() => closeToLeft(tab.id)}
                            hasOtherTabs={hasOtherTabs}
                            hasTabsToRight={index < tabs.length - 1}
                            hasTabsToLeft={index > 0}
                          />
                        </Reorder.Item>
                      );
                    })}
                  </AnimatePresence>
                </Reorder.Group>

                <motion.div layout className="flex-shrink-0">
                  <NewTabButton navItems={menuItems} onAddTab={addTab} />
                </motion.div>
              </div>

              {toolbar && <div className="mb-1 mr-1 flex flex-shrink-0 items-center gap-1 self-center">{toolbar}</div>}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Tab options"
                    className="mb-0.5 mr-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => addTab()}>
                    <Plus />
                    New Tab
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={closeAll} disabled={!hasOtherTabs} className={cn(hasOtherTabs && "text-destructive focus:text-destructive")}>
                    <Trash2 />
                    Close All Tabs
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <main className="flex-1 overflow-hidden">
              <div className="page-grid flex h-full flex-col overflow-auto">
                {banner}
                {routeMode ? (
                  <div className="flex-1">{content}</div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${activeTabId}-${activeNavId}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="h-full"
                    >
                      {content}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </main>
          </div>
        </div>
      </TabsContext.Provider>
    </TooltipProvider>
  );
}
