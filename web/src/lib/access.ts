import "server-only";
import { notFound, redirect } from "next/navigation";
import { requireUser, type CurrentUser } from "./auth";
import { getSettings, listAccessRequests } from "./data";
import { MODULES, MODULE_KEYS, isFormModuleKey, type ModuleKey } from "./constants";
import type { AccessRequest, GlobalSettings, ModuleAccess } from "./types";
import { isDeadlinePassed } from "./utils";

const PERMISSION: Record<ModuleKey, "canReadiness" | "canClosure" | "canIea"> = {
  readiness: "canReadiness",
  closure: "canClosure",
  iea: "canIea",
};

/** What this user may do in one module right now: open?, past deadline?, may write? */
export function moduleAccess(
  user: CurrentUser,
  settings: GlobalSettings,
  key: ModuleKey,
  requests: AccessRequest[] = [],
): ModuleAccess {
  const meta = MODULES[key];
  const open = user.isAdmin || (settings[meta.enabledKey] && user[PERMISSION[key]]);
  const deadline = settings[meta.deadlineKey];
  const deadlinePassed = isDeadlinePassed(deadline);
  const hasOverride = user.overrides[key];
  return {
    key,
    open,
    deadline,
    deadlinePassed,
    hasOverride,
    // Admins are never locked out by a deadline.
    canWrite: open && (user.isAdmin || !deadlinePassed || hasOverride),
    request: requests.find((r) => r.module_key === key) ?? null,
  };
}

export async function allModuleAccess(user: CurrentUser): Promise<Record<ModuleKey, ModuleAccess>> {
  const [settings, requests] = await Promise.all([getSettings(), listAccessRequests(user.email)]);
  return Object.fromEntries(MODULE_KEYS.map((key) => [key, moduleAccess(user, settings, key, requests)])) as Record<
    ModuleKey,
    ModuleAccess
  >;
}

/** For server actions: an error message if the user may not write to this module, else null. */
export async function writeBlockedReason(user: CurrentUser, key: ModuleKey): Promise<string | null> {
  const access = moduleAccess(user, await getSettings(), key);
  const label = MODULES[key].label;
  if (!access.open) return `${label} is not open for you right now.`;
  if (!access.canWrite) return `The deadline for ${label} has passed. Request late access from the Office of Academics.`;
  return null;
}

/** Resolve a module page: signed in, module open. Returns the user's access state for it. */
export async function requireModuleAccess(key: ModuleKey) {
  const user = await requireUser();
  const [settings, requests] = await Promise.all([getSettings(), listAccessRequests(user.email)]);
  const access = moduleAccess(user, settings, key, requests);
  if (!access.open) redirect("/");
  return { user, settings, access };
}

/** Resolve the [module] route segment for the readiness / closure pages. */
export async function requireFormModule(segment: string) {
  if (!isFormModuleKey(segment)) notFound();
  return { module: segment, ...(await requireModuleAccess(segment)) };
}
