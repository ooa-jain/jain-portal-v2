import "server-only";
import { collections } from "./db";
import { getSettings } from "./data";
import { ownerFilter } from "./iea";
import { MODULES, MODULE_KEYS, type ModuleKey } from "./constants";
import { esc, sendEmail } from "./mail";
import { env } from "./env";
import { formatDeadline, parseDeadline, str } from "./utils";

/** True when this person already has a final (non-draft) submission for the module. */
export async function hasSubmitted(module: ModuleKey, email: string): Promise<boolean> {
  if (module === "iea") {
    return Boolean(await collections.iea().findOne({ submitted: true, ...ownerFilter(email) }));
  }
  return Boolean(
    await collections.submissions().findOne({ "identity.submitterEmail": email, form_type: module, _draft: false }),
  );
}

function loginUrl() {
  return env.baseUrl ? `${env.baseUrl}/login` : "";
}

export async function sendReminderEmail(
  to: string,
  name: string,
  module: ModuleKey,
  deadline: string,
  urgency: "2day" | "1hour" | "manual",
): Promise<boolean> {
  const label = MODULES[module].label;
  const when = formatDeadline(deadline);
  const lead =
    urgency === "1hour"
      ? `the submission window for <strong>${esc(label)}</strong> closes in <strong>about one hour</strong>.`
      : urgency === "2day"
        ? `the submission window for <strong>${esc(label)}</strong> closes in <strong>two days</strong>.`
        : `your <strong>${esc(label)}</strong> submission is still pending.`;
  const subject =
    urgency === "1hour"
      ? `Final reminder: ${label} closes in 1 hour`
      : urgency === "2day"
        ? `Reminder: ${label} closes in 2 days`
        : `Reminder: ${label} submission pending`;
  const url = loginUrl();
  return sendEmail(
    to,
    subject,
    `<p>Dear ${esc(name || "HOD")},</p>
     <p>This is a reminder that ${lead}</p>
     ${deadline ? `<p style="font-weight:700;color:#b42318">Deadline: ${esc(when)} (IST)</p>` : ""}
     <p>Please sign in and complete your submission. If you have already submitted, ignore this email.</p>
     ${url ? `<p><a href="${url}" style="display:inline-block;background:#0a2558;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:700">Open the portal</a></p>` : ""}`,
  );
}

type Recipient = { email: string; name: string; department: string };

export async function allRecipients(): Promise<Recipient[]> {
  const users = await collections.users().find({}, { projection: { email: 1, name: 1, department: 1 } }).toArray();
  return users
    .map((u) => ({ email: str(u.email).toLowerCase(), name: str(u.name), department: str(u.department) }))
    .filter((u) => u.email);
}

/** Email everyone in `recipients` whose submission for `module` is still pending. Returns the number sent. */
export async function remindPending(recipients: Recipient[], modules: ModuleKey[]): Promise<number> {
  const settings = await getSettings();
  let sent = 0;
  for (const key of modules) {
    if (!settings[MODULES[key].enabledKey]) continue;
    const deadline = settings[MODULES[key].deadlineKey];
    for (const person of recipients) {
      if (await hasSubmitted(key, person.email)) continue;
      if (await sendReminderEmail(person.email, person.name, key, deadline, "manual")) sent++;
    }
  }
  return sent;
}

/**
 * Scheduled check: 48 hours and 1 hour before each module deadline, email
 * everyone who has not submitted. Each (module, window, deadline, person) is
 * recorded so a reminder is never sent twice, however often this runs.
 */
export async function runDeadlineReminders(now = new Date()): Promise<{ sent: number; checked: string[] }> {
  const checked: string[] = [];
  // Without SMTP nothing can be sent; do not record anything as sent.
  if (!env.mail) return { sent: 0, checked };
  const settings = await getSettings();
  const recipients = await allRecipients();
  let sent = 0;

  for (const key of MODULE_KEYS) {
    const meta = MODULES[key];
    const deadline = settings[meta.deadlineKey];
    const due = parseDeadline(deadline);
    if (!settings[meta.enabledKey] || !due) continue;
    const hoursLeft = (due.getTime() - now.getTime()) / 3_600_000;
    if (hoursLeft <= 0) continue;

    for (const [window, limit] of [["2day", 48], ["1hour", 1]] as const) {
      if (hoursLeft > limit) continue;
      checked.push(`${key}:${window}`);
      for (const person of recipients) {
        if (await hasSubmitted(key, person.email)) continue;
        const reminderId = `reminder_${key}_${window}_${deadline}_${person.email}`;
        // Claim the key first: if two runs overlap, only one inserts and sends.
        try {
          await collections.sentReminders().insertOne({ _id: reminderId, sent_at: new Date().toISOString().replace("Z", "") });
        } catch {
          continue; // already sent
        }
        if (await sendReminderEmail(person.email, person.name, key, deadline, window)) {
          sent++;
        } else {
          // Sending failed: release the claim so the next run tries again.
          await collections.sentReminders().deleteOne({ _id: reminderId });
        }
      }
    }
  }
  return { sent, checked };
}
