"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { collections } from "@/lib/db";
import { getCurrentUser, isAdminEmail } from "@/lib/auth";
import { addNotification, getSettings, toObjectId } from "@/lib/data";
import { DEPARTMENTS, MODULES, MODULE_KEYS, isModuleKey, moduleFromLabel, type ModuleKey } from "@/lib/constants";
import { env } from "@/lib/env";
import { esc, sendEmail } from "@/lib/mail";
import { allRecipients, remindPending } from "@/lib/reminders";
import { createSession, readSession } from "@/lib/session";
import type { ActionResult } from "@/lib/types";
import { formatDeadline, nowStamp, str } from "@/lib/utils";

/** The signed-in admin, or null. An admin viewing as another user is not acting as admin. */
async function admin() {
  const user = await getCurrentUser();
  return user?.isAdmin && !user.impersonatedBy ? user : null;
}

const DENIED = { ok: false as const, error: "Admin access is required." };

// ── Settings ────────────────────────────────────────────────────────

const deadline = z.string().regex(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})?$/);

const settingsSchema = z.object({
  readiness_enabled: z.boolean(),
  closure_enabled: z.boolean(),
  iea_enabled: z.boolean(),
  readiness_deadline: deadline,
  closure_deadline: deadline,
  iea_deadline: deadline,
  enabled_years: z.array(z.string().regex(/^\d{4}-\d{2}$/)).min(1).max(20),
  enabled_semesters: z.array(z.enum(["Even", "Odd"])).min(1),
});

export async function saveSettings(input: z.input<typeof settingsSchema>): Promise<ActionResult> {
  if (!(await admin())) return DENIED;
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Keep at least one academic year (format 2026-27) and one semester, and check the deadline dates." };
  }
  const previous = await getSettings();
  await collections.settings().updateOne({ _id: "global" }, { $set: parsed.data }, { upsert: true });

  // Tell everyone when a module opens or its deadline moves.
  for (const key of MODULE_KEYS) {
    const meta = MODULES[key];
    if (!previous[meta.enabledKey] && parsed.data[meta.enabledKey]) {
      await addNotification(`${meta.label} is open`, `${meta.label} is now open for submissions.`, "broadcast");
    } else if (parsed.data[meta.deadlineKey] && parsed.data[meta.deadlineKey] !== previous[meta.deadlineKey]) {
      await addNotification(
        `${meta.label} deadline updated`,
        `The last date for ${meta.label} is now ${formatDeadline(parsed.data[meta.deadlineKey])} (IST).`,
        "broadcast",
      );
    }
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Users ───────────────────────────────────────────────────────────

async function setAdminListed(email: string, listed: boolean) {
  const settings = await getSettings();
  const list = new Set(settings.admin_emails);
  if (listed) list.add(email);
  else list.delete(email);
  await collections.settings().updateOne({ _id: "global" }, { $set: { admin_emails: [...list] } }, { upsert: true });
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
  await collections.users().updateOne({ email: target }, { $set: { is_admin: makeAdmin, role: makeAdmin ? "admin" : "user" } });
  await setAdminListed(target, makeAdmin);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function setUserPermission(email: string, module: string, allowed: boolean): Promise<ActionResult> {
  if (!(await admin())) return DENIED;
  if (!isModuleKey(module)) return { ok: false, error: "Unknown module." };
  await collections
    .users()
    .updateOne({ email: email.trim().toLowerCase() }, { $set: { [MODULES[module].permissionField]: allowed } });
  revalidatePath("/admin", "layout");
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
  revalidatePath("/admin", "layout");
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
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// ── View as another user ────────────────────────────────────────────

/** Open the portal exactly as another user sees it. The admin's own identity is kept in the session. */
export async function impersonate(email: string): Promise<ActionResult> {
  const me = await admin();
  if (!me) return DENIED;
  const target = await collections.users().findOne({ email: email.trim().toLowerCase() });
  if (!target) return { ok: false, error: "User not found." };
  if (str(target.email) === me.email) return { ok: false, error: "That is your own account." };
  await createSession({ email: str(target.email), name: str(target.name) || str(target.email), impersonator: me.email });
  redirect("/");
}

export async function stopImpersonating() {
  const session = await readSession();
  // Only return to an account that is still an admin.
  if (session?.impersonator && (await isAdminEmail(session.impersonator))) {
    const adminDoc = await collections.users().findOne({ email: session.impersonator });
    await createSession({ email: session.impersonator, name: str(adminDoc?.name) || session.impersonator });
    redirect("/admin/users");
  }
  redirect("/");
}

// ── Late-access and edit requests ───────────────────────────────────

export async function approveAccess(requestId: string, adminComment: string): Promise<ActionResult> {
  if (!(await admin())) return DENIED;
  const _id = toObjectId(requestId);
  const request = _id ? await collections.accessRequests().findOne({ _id }) : null;
  if (!request) return { ok: false, error: "Request not found." };
  const meta = moduleFromLabel(str(request.module));
  if (!meta) return { ok: false, error: `Unrecognised module "${str(request.module)}" on this request.` };

  const email = str(request.user_email).toLowerCase();
  const comment = adminComment.trim().slice(0, 2000);
  await collections.users().updateOne({ email }, { $set: { [meta.overrideField]: true } });
  await collections.accessRequests().updateOne({ _id: _id! }, { $set: { status: "approved", admin_comment: comment } });
  await sendEmail(
    email,
    `Approved: late submission access for ${meta.label}`,
    `<p>Dear ${esc(str(request.user_name) || "HOD")},</p>
     <p>Your request for late submission access to <strong>${esc(meta.label)}</strong> has been <strong>approved</strong>.</p>
     ${comment ? `<p><strong>Remarks:</strong> ${esc(comment)}</p>` : ""}
     <p>You can now sign in and complete your submission.</p>`,
  );
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Remove late access for a module (also clears the request so the person can ask again). */
export async function revokeAccess(email: string, module: string): Promise<ActionResult> {
  if (!(await admin())) return DENIED;
  if (!isModuleKey(module)) return { ok: false, error: "Unknown module." };
  const target = email.trim().toLowerCase();
  await collections.users().updateOne({ email: target }, { $set: { [MODULES[module].overrideField]: false } });
  await collections.accessRequests().deleteMany({ user_email: target, module: MODULES[module].label });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function approveEdit(submissionId: string): Promise<ActionResult> {
  if (!(await admin())) return DENIED;
  const _id = toObjectId(submissionId);
  if (!_id) return { ok: false, error: "Submission not found." };
  const result = await collections
    .submissions()
    .updateOne({ _id }, { $set: { "edit_request.status": "approved", "edit_request.pending": false } });
  if (result.matchedCount === 0) return { ok: false, error: "Submission not found." };
  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Notifications ───────────────────────────────────────────────────

export async function sendNotification(title: string, body: string): Promise<ActionResult> {
  if (!(await admin())) return DENIED;
  if (!title.trim() || !body.trim()) return { ok: false, error: "Enter a title and a message." };
  await addNotification(title.trim().slice(0, 200), body.trim().slice(0, 2000), "custom");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteNotification(id: string): Promise<ActionResult> {
  if (!(await admin())) return DENIED;
  const _id = toObjectId(id);
  if (!_id) return { ok: false, error: "Notification not found." };
  await collections.notifications().deleteOne({ _id });
  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Reminder emails ─────────────────────────────────────────────────

/**
 * Email people whose submission is still pending.
 * target: "all_pending", "pending_<module>", or "specific_dept" (with department).
 */
export async function sendReminders(target: string, department = ""): Promise<ActionResult<{ sent: number }>> {
  if (!(await admin())) return DENIED;
  if (!env.mail) return { ok: false, error: "Email is not set up on the server (EMAIL_USER / EMAIL_PASS)." };

  let recipients = await allRecipients();
  let modules: ModuleKey[] = MODULE_KEYS;
  if (target.startsWith("pending_")) {
    const key = target.slice("pending_".length);
    if (!isModuleKey(key)) return { ok: false, error: "Unknown reminder group." };
    modules = [key];
  } else if (target === "specific_dept") {
    recipients = recipients.filter((r) => r.department === department);
    if (recipients.length === 0) return { ok: false, error: `No registered user found for "${department}".` };
  } else if (target !== "all_pending") {
    return { ok: false, error: "Unknown reminder group." };
  }
  return { ok: true, sent: await remindPending(recipients, modules) };
}
