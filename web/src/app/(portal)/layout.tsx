import { requireUser } from "@/lib/auth";
import { collections } from "@/lib/db";
import { getSettings, listNotifications } from "@/lib/data";
import { moduleAccess } from "@/lib/access";
import { MODULES, MODULE_KEYS } from "@/lib/constants";
import { AppShell, type NavGroup } from "@/components/app-shell";

export default async function PortalLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const [settings, notifications] = await Promise.all([getSettings(), listNotifications(10)]);

  const workspace: NavGroup = { title: "Workspace", items: [{ href: "/", label: "Home", icon: "dashboard" }] };
  for (const key of MODULE_KEYS) {
    if (moduleAccess(user, settings, key).open) {
      workspace.items.push({ href: MODULES[key].href, label: MODULES[key].label, icon: key });
    }
  }
  // The latest academic year offered in forms, e.g. "2027-28" -> "2027–28".
  const cycle = [...settings.enabled_years].sort().pop()?.replace("-", "–") ?? "";

  const reports: NavGroup = {
    title: "Reports",
    items: [
      { href: "/analysis", label: "Faculty Responses", icon: "analysis" },
      { href: "/iea-analysis", label: "IEA Analysis", icon: "ieaAnalysis" },
    ],
  };
  const groups = [workspace, reports];

  if (user.isAdmin && !user.impersonatedBy) {
    const [accessPending, editPending] = await Promise.all([
      collections.accessRequests().countDocuments({ status: "pending" }),
      collections.submissions().countDocuments({ "edit_request.status": "pending" }),
    ]);
    groups.push({
      title: "Administration",
      items: [
        { href: "/admin", label: "Overview", icon: "admin" },
        { href: "/admin/submissions", label: "Submissions", icon: "submissions" },
        { href: "/admin/iea", label: "IEA Submissions", icon: "iea" },
        { href: "/admin/users", label: "Users & Access", icon: "users" },
        { href: "/admin/requests", label: "Requests", icon: "requests", badge: accessPending + editPending },
        { href: "/admin/notifications", label: "Notifications", icon: "notifications" },
        { href: "/admin/settings", label: "Settings", icon: "settings" },
      ],
    });
  }

  return (
    <AppShell
      groups={groups}
      user={{ name: user.name, email: user.email, department: user.department, isAdmin: user.isAdmin }}
      impersonatedBy={user.impersonatedBy}
      notifications={notifications}
      cycle={cycle}
    >
      {children}
    </AppShell>
  );
}
