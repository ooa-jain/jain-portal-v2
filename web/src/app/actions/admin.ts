"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { collections } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings, toObjectId } from "@/lib/data";
import { DEPARTMENTS } from "@/lib/constants";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/types";
import { nowStamp, str } from "@/lib/utils";

async function admin() {
  const user = await getCurrentUser();
  return user?.isAdmin ? user : null;
}

const DENIED: ActionResult = { ok: false, error: "Admin access is required." };

const settingsSchema = z.object({
  readiness_enabled: z.boolean(),
  closure_enabled: z.boolean(),
  enabled_years: z.array(z.string().regex(/^\d{4}-\d{2}$/)).min(1).max(20),
  enabled_semesters: z.array(z.enum(["Even", "Odd"])).min(1),
});

export async function saveSettings(input: z.input<typeof settingsSchema>): Promise<ActionResult> {
  if (!(await admin())) return DENIED;
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Keep at least one academic year (format 2026-27) and one semester." };
  }
  await collections.settings().updateOne({ _id: "global" }, { $set: parsed.data }, { upsert: true });
  revalidatePath("/", "layout");
  return { ok: true };
}

async function setAdminListed(email: string, listed: boolean) {
  const settings = await getSettings();
  const list = new Set(settings.admin_emails);
  if (listed) list.add(email);
  else list.delete(email);
  await collections
    .settings()
    .updateOne({ _id: "global" }, { $set: { admin_emails: [...list] } }, { upsert: true });
}

export async function setUserAdmin(email: string, makeAdmin: boolean): Promise<ActionResult> {
  const me = await admin();
  if (!me) return DENIED;
  const target = email.trim().toLowerCase();
  if (!target) return { ok: false, error: "Email is required." };
  if (!makeAdmin && target === me.email) return { ok: false, error: "You cannot remove your own admin access." };
  if (!makeAdmin && env.adminEmails.has(target)) {
    return { ok: false, error: "This admin is set in the server configuration (ADMIN_EMAILS) and cannot be changed here." };
  }
  await collections
    .users()
    .updateOne({ email: target }, { $set: { is_admin: makeAdmin, role: makeAdmin ? "admin" : "user" } });
  await setAdminListed(target, makeAdmin);
  revalidatePath("/admin");
  return { ok: true };
}

export async function setUserPermissions(
  email: string,
  permissions: { can_readiness: boolean; can_closure: boolean },
): Promise<ActionResult> {
  if (!(await admin())) return DENIED;
  await collections.users().updateOne(
    { email: email.trim().toLowerCase() },
    { $set: { can_readiness: Boolean(permissions.can_readiness), can_closure: Boolean(permissions.can_closure) } },
  );
  revalidatePath("/admin");
  return { ok: true };
}

const userSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email().max(200),
  department: z.string().trim().max(200),
  isAdmin: z.boolean(),
});

/** Pre-register a user (or update one) so their department and role are set before first sign-in. */
export async function saveUser(input: z.input<typeof userSchema>): Promise<ActionResult> {
  if (!(await admin())) return DENIED;
  const parsed = userSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a name and a valid email address." };
  const data = parsed.data;
  if (data.department && !DEPARTMENTS.includes(data.department)) {
    return { ok: false, error: "Choose a department from the list." };
  }
  if (!data.email.endsWith(`@${env.allowedDomain}`) && !env.adminEmails.has(data.email)) {
    return { ok: false, error: `Only @${env.allowedDomain} accounts can sign in.` };
  }

  await collections.users().updateOne(
    { email: data.email },
    {
      $set: {
        name: data.name,
        department: data.department,
        is_admin: data.isAdmin,
        role: data.isAdmin ? "admin" : "user",
        first_time_login: !data.department,
      },
      $setOnInsert: { email: data.email, created_at: nowStamp(), auth_provider: "admin_created" },
    },
    { upsert: true },
  );
  if (data.isAdmin) await setAdminListed(data.email, true);
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  const me = await admin();
  if (!me) return DENIED;
  const _id = toObjectId(userId);
  if (!_id) return { ok: false, error: "User not found." };
  const user = await collections.users().findOne({ _id });
  if (!user) return { ok: false, error: "User not found." };
  const email = str(user.email).toLowerCase();
  if (email === me.email) return { ok: false, error: "You cannot delete your own account." };

  await collections.users().deleteOne({ _id });
  await setAdminListed(email, false);
  revalidatePath("/admin");
  return { ok: true };
}
