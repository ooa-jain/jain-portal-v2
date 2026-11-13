import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { SiteHeader, type NavLink } from "@/components/site-header";

export default async function PortalLayout({ children }: LayoutProps<"/">) {
  const [user, settings] = await Promise.all([requireUser(), getSettings()]);

  const links: NavLink[] = [{ href: "/", label: "Dashboard" }];
  if (user.isAdmin || (settings.readiness_enabled && user.canReadiness)) {
    links.push({ href: "/readiness", label: "Semester Readiness" });
  }
  if (user.isAdmin || (settings.closure_enabled && user.canClosure)) {
    links.push({ href: "/closure", label: "Semester Closure" });
  }
  if (user.isAdmin) links.push({ href: "/admin", label: "Admin" });

  return (
    <>
      <SiteHeader links={links} userName={user.name} userEmail={user.email} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <footer className="border-t py-5 text-center text-xs text-muted-foreground">
        Office of Academics · JAIN (Deemed-to-be University)
      </footer>
    </>
  );
}
