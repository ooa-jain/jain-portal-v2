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
