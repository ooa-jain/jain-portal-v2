"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { collections } from "@/lib/db";
import { getCurrentUser, isAdminEmail, isAllowedEmail, verifyFirebaseToken } from "@/lib/auth";
import { destroySession } from "@/lib/session";
import { env } from "@/lib/env";
import { DEPARTMENTS } from "@/lib/constants";
import type { ActionResult } from "@/lib/types";
import { startSessionFor } from "@/lib/login";
import { DUMMY_HASH, hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { nowStamp, str } from "@/lib/utils";

export async function signInWithGoogle(idToken: string): Promise<ActionResult<{ redirectTo: string }>> {
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
    return { ok: false, error: `Too many wrong attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or sign in with Google.` };
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
      return { ok: false, error: "This account has no password yet. Sign in with Google, or ask the Office of Academic Affairs to set one." };
    }
    return { ok: false, error: "Email or password is incorrect." };
  }

  await users.updateOne({ _id: user._id }, { $set: { failed_logins: 0, lock_until: null } });
  await startSessionFor({ email, name: str(user.name) || email.split("@")[0], picture: "" }, remember);
  return { ok: true, redirectTo: (await isAdminEmail(email)) ? "/admin" : "/" };
}

/** Signed-in users can set or change their own password. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Please sign in again." };
  if (user.impersonatedBy) return { ok: false, error: "You cannot change a password while viewing as another user." };
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
