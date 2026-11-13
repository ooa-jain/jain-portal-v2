import "server-only";
import { notFound, redirect } from "next/navigation";
import { requireUser, type CurrentUser } from "./auth";
import { getSettings } from "./data";
import { isModuleKey, type ModuleKey } from "./constants";
import type { GlobalSettings } from "./types";

export function moduleOpenFor(user: CurrentUser, settings: GlobalSettings, module: ModuleKey): boolean {
  if (user.isAdmin) return true;
  return module === "readiness"
    ? settings.readiness_enabled && user.canReadiness
    : settings.closure_enabled && user.canClosure;
}

/** Resolve the [module] route segment, and send the user home if the module is closed to them. */
export async function requireModule(segment: string) {
  if (!isModuleKey(segment)) notFound();
  const [user, settings] = await Promise.all([requireUser(), getSettings()]);
  if (!moduleOpenFor(user, settings, segment)) redirect("/");
  return { module: segment, user, settings };
}
