"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { collections } from "@/lib/db";
import { getCurrentUser, isAdminEmail, isAllowedEmail, verifyFirebaseToken } from "@/lib/auth";
import { destroySession } from "@/lib/session";
import { env } from "@/lib/env";
import { DEMO_ACCOUNTS, DEMO_DEPARTMENT, DEPARTMENTS, type DemoRole } from "@/lib/constants";
import type { ActionResult } from "@/lib/types";
import { startSessionFor } from "@/lib/login";
import { DUMMY_HASH, hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { nowStamp, str } from "@/lib/utils";

export async function signInWithGoogle(idToken: string): Promise<ActionResult<{ redirectTo: string }>> {
  // Google sign-in is off: it would let any university Google account create a login.
  // Set GOOGLE_LOGIN=1 only if it is offered again (with department set by an admin).
  if (process.env.GOOGLE_LOGIN !== "1") return { ok: false, error: "Sign in with your email and password." };
  if (!idToken) return { ok: false, error: "Missing sign-in token." };

  let identity;
  try {
    identity = await verifyFirebaseToken(idToken);
  } catch (error) {
    console.error("[auth] Google sign-in verification failed:", error);
    return { ok: false, error: "Could not verify Google sign-in. Please try again." };
  }

  if (!isAllowedEmail(identity.email)) {
    return {
      ok: false,
      error: `Please sign in with your @${env.allowedDomain} account.`,
    };
  }

  await startSessionFor(identity);
  const admin = await isAdminEmail(identity.email);
  return { ok: true, redirectTo: admin ? "/admin" : "/" };
}

export async function signOut() {
  await destroySession();
  redirect("/login");
}

export async function updateDepartment(department: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  if (user.isDemo) return { ok: false, error: "Demo accounts stay in the demo department." };
  // The department decides whose data an account sees, so only the Office of
  // Academic Affairs sets it (Users & Access). Faculty get theirs from the HOD's link.
  if (!user.isAdmin) {
    return { ok: false, error: "Only the Office of Academic Affairs can set your department. Please ask them." };
  }
  if (!DEPARTMENTS.includes(department)) return { ok: false, error: "Choose a department from the list." };

  await collections
    .users()
    .updateOne({ email: user.email }, { $set: { department, first_time_login: false } });
  revalidatePath("/", "layout");
  return { ok: true };
}

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

/** Email + password sign-in, for accounts that have a password (set by an admin, or carried over from the old portal). */
export async function signInWithPassword(
  emailInput: string,
  password: string,
  remember = true,
  next = "",
): Promise<ActionResult<{ redirectTo: string }>> {
  const email = str(emailInput).trim().toLowerCase();
  if (!email || !password) return { ok: false, error: "Enter your email and password." };
  if (password.length > 200) return { ok: false, error: "Email or password is incorrect." };

  const users = collections.users();
  const user = await users.findOne({ email });
  const stored = str(user?.password);

  const lockedUntil = user?.lock_until ? new Date(str(user.lock_until)) : null;
  if (lockedUntil && lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
    return { ok: false, error: `Too many wrong attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` };
  }

  // Always run one hash check, so a missing account takes as long as a wrong password.
  const valid = await verifyPassword(password, stored || DUMMY_HASH);
  if (!user || !stored || !valid) {
    if (user) {
      const failures = (Number(user.failed_logins) || 0) + 1;
      await users.updateOne(
        { _id: user._id },
        failures >= MAX_FAILURES
          ? { $set: { failed_logins: 0, lock_until: new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() } }
          : { $set: { failed_logins: failures } },
      );
    }
    if (user && !stored) {
      return { ok: false, error: "This account has no password yet. Ask the Office of Academic Affairs to set one." };
    }
    return { ok: false, error: "Email or password is incorrect." };
  }

  await users.updateOne({ _id: user._id }, { $set: { failed_logins: 0, lock_until: null } });
  await startSessionFor({ email, name: str(user.name) || email.split("@")[0], picture: "" }, remember);
  // Only same-site paths, e.g. back to the checklist link the user came from.
  if (/^\/(?!\/)[\w\-./?=&%]*$/.test(next)) return { ok: true, redirectTo: next };
  return { ok: true, redirectTo: (await isAdminEmail(email)) ? "/admin" : "/" };
}

/** Signed-in users can set or change their own password. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Please sign in again." };
  if (user.impersonatedBy) return { ok: false, error: "You cannot change a password while viewing as another user." };
  if (user.isDemo) return { ok: false, error: "Demo accounts cannot set a password." };
  const problem = passwordProblem(newPassword);
  if (problem) return { ok: false, error: problem };

  const doc = await collections.users().findOne({ email: user.email });
  const stored = str(doc?.password);
  // An account that already has a password must confirm the current one.
  if (stored && !(await verifyPassword(currentPassword, stored))) {
    return { ok: false, error: "Your current password is incorrect." };
  }
  await collections.users().updateOne(
    { email: user.email },
    { $set: { password: await hashPassword(newPassword), password_changed_at: nowStamp(), failed_logins: 0, lock_until: null } },
  );
  return { ok: true };
}

/**
 * Demo sign-in for testers, only when DEMO_LOGIN=1. Signs in to a fixed test
 * account in the demo department (HOD or faculty, never admin), for this
 * browser session only.
 */
export async function signInAsDemo(role: DemoRole): Promise<ActionResult<{ redirectTo: string }>> {
  if (!env.demoLogin) return { ok: false, error: "Demo sign-in is turned off." };
  const account = DEMO_ACCOUNTS[role];
  if (!account) return { ok: false, error: "Unknown demo account." };
  const email = `${account.local}@${env.allowedDomain}`;
  if (await isAdminEmail(email)) return { ok: false, error: "This demo account is set up as an admin, so demo sign-in is blocked." };

  await collections.users().updateOne(
    { email },
    {
      $set: {
        name: account.name,
        department: DEMO_DEPARTMENT,
        role: role === "faculty" ? "faculty" : "hod",
        is_demo: true,
        is_admin: false,
        first_time_login: false,
        password: "",
      },
      $setOnInsert: { email, created_at: nowStamp(), auth_provider: "demo", picture: "" },
    },
    { upsert: true },
  );
  await startSessionFor({ email, name: account.name, picture: "" }, false);
  return { ok: true, redirectTo: "/" };
}
