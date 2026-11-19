import "server-only";
import { collections } from "./db";
import { getSettings } from "./data";
import { ownerFilter } from "./iea";
import { LISTED_MODULE_KEYS, MODULES, type ModuleKey } from "./constants";
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
     ${url ? `<p><a href="${url}" style="display:inline-block;background:#23263f;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:700">Open the portal</a></p>` : ""}`,
  );
}

type Recipient = { email: string; name: string; department: string };

/** People who file module submissions: not faculty accounts (they fill checklists) and not demo accounts. */
export async function allRecipients(): Promise<Recipient[]> {
  const users = await collections
    .users()
    .find({ role: { $ne: "faculty" }, is_demo: { $ne: true } }, { projection: { email: 1, name: 1, department: 1 } })
    .toArray();
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

  // Only the modules people see; Innovation & Emerging Areas is not listed, so it sends no reminders.
  for (const key of LISTED_MODULE_KEYS) {
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

/** The HOD's "submit by" date ("2026-07-28", or with a time) as the end of that day in India time. */
function hodDue(value: string): Date | null {
  const v = value.trim();
  if (!v) return null;
  return parseDeadline(/T\d{2}:\d{2}/.test(v) ? v.slice(0, 16) : `${v.slice(0, 10)}T23:59`);
}

/** Claim a reminder key so overlapping runs never send it twice. False when already sent. */
async function claim(id: string): Promise<boolean> {
  try {
    await collections.sentReminders().insertOne({ _id: id, sent_at: new Date().toISOString().replace("Z", "") });
    return true;
  } catch {
    return false;
  }
}

/**
 * Scheduled check for faculty checklists: 3 days and 1 day before each HOD's
 * "submit by" date, email the department's registered faculty who have not
 * filled that checklist, and send the HOD one list of who is still pending.
 */
export async function runFacultyChecklistReminders(now = new Date()): Promise<{ sent: number; links: number }> {
  if (!env.mail) return { sent: 0, links: 0 };
  const base = env.baseUrl;
  const parents = await collections
    .submissions()
    .find({ share_token: { $exists: true, $ne: "" }, "identity.dept": { $nin: ["", null] }, "identity.hodDeadline": { $nin: ["", null] } })
    .toArray();
  let sent = 0;
  let links = 0;

  for (const parent of parents) {
    const identity = (parent.identity ?? {}) as Record<string, unknown>;
    const deadline = str(identity.hodDeadline);
    const due = hodDue(deadline);
    if (!due) continue;
    const daysLeft = (due.getTime() - now.getTime()) / 86_400_000;
    if (daysLeft <= 0 || daysLeft > 3) continue;
    const window = daysLeft <= 1 ? "1day" : "3day";
    links++;

    const parentId = String(parent._id);
    const dept = str(identity.dept);
    const label = MODULES[str(parent.form_type) as ModuleKey]?.label ?? "checklist";
    const url = base ? `${base}/faculty-form/${str(parent.share_token)}` : "";
    const [faculty, answered] = await Promise.all([
      collections.users().find({ role: "faculty", department: dept, is_demo: { $ne: true } }, { projection: { email: 1, name: 1 } }).toArray(),
      collections.facultySubmissions().distinct("faculty_email", { parent_submission_id: parentId }),
    ]);
    const done = new Set(answered.map((e) => String(e).toLowerCase()));
    const pending = faculty.filter((f) => !done.has(str(f.email).toLowerCase()));

    for (const person of pending) {
      const email = str(person.email).toLowerCase();
      const id = `faculty_${parentId}_${window}_${deadline}_${email}`;
      if (!(await claim(id))) continue;
      const ok = await sendEmail(
        email,
        window === "1day" ? `Last day: Faculty ${label} checklist` : `Reminder: Faculty ${label} checklist due ${deadline}`,
        `<p>Dear ${esc(str(person.name) || "Faculty")},</p>
         <p>${esc(str(identity.hodName) || "Your HOD")}, Head of <strong>${esc(dept)}</strong>, is waiting for your faculty
         ${esc(label)} checklist${str(identity.semester) ? ` for <strong>${esc(str(identity.semester))}</strong>` : ""}.
         Please fill it by <strong>${esc(deadline)}</strong>${window === "1day" ? " (tomorrow or sooner)" : ""}.</p>
         ${url ? `<p><a href="${url}" style="display:inline-block;background:#0e2a5c;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700">Fill the checklist</a></p>` : ""}
         <p>If you have already filled it, ignore this email.</p>`,
      );
      if (ok) sent++;
      else await collections.sentReminders().deleteOne({ _id: id });
    }

    const hodEmail = str(identity.hodEmail).toLowerCase();
    if (hodEmail && pending.length) {
      const id = `facultysummary_${parentId}_${window}_${deadline}`;
      if (await claim(id)) {
        const names = pending.map((f) => `<li>${esc(str(f.name) || str(f.email))} (${esc(str(f.email))})</li>`).join("");
        const ok = await sendEmail(
          hodEmail,
          `${pending.length} faculty yet to fill the ${label} checklist`,
          `<p>Dear ${esc(str(identity.hodName) || "HOD")},</p>
           <p>Your faculty ${esc(label)} checklist is due on <strong>${esc(deadline)}</strong>. These registered faculty of
           ${esc(dept)} have not filled it yet, and have been sent a reminder:</p><ul>${names}</ul>
           <p>Faculty who have not registered on the portal are not listed; share the link with them directly.</p>`,
        );
        if (ok) sent++;
        else await collections.sentReminders().deleteOne({ _id: id });
      }
    }
  }
  return { sent, links };
}
