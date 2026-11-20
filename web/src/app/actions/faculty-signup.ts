"use server";

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { collections } from "@/lib/db";
import { getSubmissionByToken } from "@/lib/data";
import { env } from "@/lib/env";
import { esc, sendEmail } from "@/lib/mail";
import { startSessionFor } from "@/lib/login";
import { hashPassword, passwordProblem } from "@/lib/password";
import type { ActionResult } from "@/lib/types";
import { nowStamp } from "@/lib/utils";

/*
 * Faculty create their own login from the checklist link their HOD shared.
 * The email address is proved with a 6-digit code sent to it, so a link
 * holder cannot open an account in a colleague's name. Only new addresses can
 * sign up this way; an existing account signs in (or asks for a reset).
 */

const CODE_MINUTES = 15;
const MAX_SENDS = 3; // per address, per CODE_MINUTES
const MAX_TRIES = 5; // wrong codes before a new code is needed

const emailSchema = z.string().trim().toLowerCase().email().max(200);

function codeHash(email: string, code: string) {
  return createHash("sha256").update(`${env.sessionSecret}:faculty-signup:${email}:${code}`).digest("hex");
}

function sameHash(a: string, b: string) {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Step 1: check the link and the address, then email a code. */
export async function startFacultySignup(token: string, nameInput: string, emailInput: string): Promise<ActionResult> {
  if (!env.mail) return { ok: false, error: "Email is not set up on the portal yet, so logins cannot be created here. Ask your HOD to create one." };
  const name = z.string().trim().min(2).max(120).safeParse(nameInput);
  if (!name.success) return { ok: false, error: "Enter your full name." };
  const parsedEmail = emailSchema.safeParse(emailInput);
  if (!parsedEmail.success) return { ok: false, error: "Enter a valid email address." };
  const email = parsedEmail.data;
  if (!email.endsWith(`@${env.allowedDomain}`)) return { ok: false, error: `Use your @${env.allowedDomain} email address.` };

  const parent = await getSubmissionByToken(token);
  if (!parent || !parent.identity.dept) return { ok: false, error: "This link is no longer valid. Ask your HOD for a new one." };

  if (await collections.users().findOne({ email })) {
    return { ok: false, error: "You already have a login. Sign in with it instead; if you have forgotten the password, ask your HOD or the Office of Academic Affairs." };
  }

  const signups = collections.facultySignups();
  const existing = await signups.findOne({ email });
  const windowStart = existing && Date.now() - Number(existing.window_start) < CODE_MINUTES * 60_000 ? Number(existing.window_start) : Date.now();
  const sends = existing && windowStart === Number(existing.window_start) ? Number(existing.sends) || 0 : 0;
  if (sends >= MAX_SENDS) return { ok: false, error: `Too many codes requested. Try again in ${CODE_MINUTES} minutes.` };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await signups.updateOne(
    { email },
    {
      $set: {
        email,
        name: name.data,
        token,
        code_hash: codeHash(email, code),
        expires_at: Date.now() + CODE_MINUTES * 60_000,
        tries: 0,
        sends: sends + 1,
        window_start: windowStart,
        created_at: nowStamp(),
      },
    },
    { upsert: true },
  );

  const sent = await sendEmail(
    email,
    `Your Jain OOA Portal code: ${code}`,
    `<p>Dear ${esc(name.data)},</p>
     <p>Use this code to create your faculty login for <strong>${esc(parent.identity.dept)}</strong>:</p>
     <p style="font-size:26px;font-weight:700;letter-spacing:6px">${code}</p>
     <p>It works for ${CODE_MINUTES} minutes. If you did not ask for it, ignore this email.</p>`,
  );
  if (!sent) return { ok: false, error: "The code could not be emailed. Try again in a minute." };
  return { ok: true };
}

/** Step 2: check the code, then create the faculty login and sign in. */
export async function completeFacultySignup(
  token: string,
  emailInput: string,
  codeInput: string,
  password: string,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsedEmail = emailSchema.safeParse(emailInput);
  if (!parsedEmail.success) return { ok: false, error: "Enter a valid email address." };
  const email = parsedEmail.data;
  const code = String(codeInput).replace(/\D/g, "");
  const problem = passwordProblem(password);
  if (problem) return { ok: false, error: problem };

  const signups = collections.facultySignups();
  const pending = await signups.findOne({ email });
  if (!pending || pending.token !== token || Number(pending.expires_at) < Date.now()) {
    return { ok: false, error: "The code has expired. Ask for a new one." };
  }
  if ((Number(pending.tries) || 0) >= MAX_TRIES) return { ok: false, error: "Too many wrong codes. Ask for a new one." };
  if (code.length !== 6 || !sameHash(codeHash(email, code), String(pending.code_hash))) {
    await signups.updateOne({ email }, { $inc: { tries: 1 } });
    return { ok: false, error: "That code is not right. Check the email and try again." };
  }

  const parent = await getSubmissionByToken(token);
  if (!parent || !parent.identity.dept) return { ok: false, error: "This link is no longer valid. Ask your HOD for a new one." };
  if (await collections.users().findOne({ email })) {
    await signups.deleteOne({ email });
    return { ok: false, error: "You already have a login. Sign in with it instead." };
  }

  const name = String(pending.name || email.split("@")[0]);
  await collections.users().insertOne({
    name,
    email,
    role: "faculty",
    department: parent.identity.dept,
    password: await hashPassword(password),
    auth_provider: "faculty_link",
    invited_by: parent.identity.hodEmail,
    invited_by_name: parent.identity.hodName,
    created_via_submission: parent._id,
    created_at: nowStamp(),
    first_time_login: false,
    can_readiness: false,
    can_closure: false,
    can_iea: false,
  });
  await signups.deleteOne({ email });
  await startSessionFor({ email, name, picture: "" });
  return { ok: true, redirectTo: `/faculty-form/${token}` };
}

/**
 * Registration when the server cannot send email (no code can be sent): name,
 * university email and password, from a valid checklist link, for an address
 * that has no account yet. Marked unverified; once email is set up, the
 * code-checked flow above is used instead.
 */
export async function registerFacultyWithoutCode(
  token: string,
  nameInput: string,
  emailInput: string,
  password: string,
): Promise<ActionResult<{ redirectTo: string }>> {
  if (env.mail) return { ok: false, error: "Ask for an email code to register." };
  const name = z.string().trim().min(2).max(120).safeParse(nameInput);
  if (!name.success) return { ok: false, error: "Enter your full name." };
  const parsedEmail = emailSchema.safeParse(emailInput);
  if (!parsedEmail.success) return { ok: false, error: "Enter a valid email address." };
  const email = parsedEmail.data;
  if (!email.endsWith(`@${env.allowedDomain}`)) return { ok: false, error: `Use your @${env.allowedDomain} email address.` };
  const problem = passwordProblem(password);
  if (problem) return { ok: false, error: problem };

  const parent = await getSubmissionByToken(token);
  if (!parent || !parent.identity.dept) return { ok: false, error: "This link is no longer valid. Ask your HOD for a new one." };
  if (await collections.users().findOne({ email })) {
    return { ok: false, error: "You already have a login. Log in with it instead; if you have forgotten the password, ask the Office of Academic Affairs." };
  }

  try {
    await collections.users().insertOne({
      name: name.data,
      email,
      role: "faculty",
      department: parent.identity.dept,
      password: await hashPassword(password),
      auth_provider: "faculty_link",
      email_verified: false,
      invited_by: parent.identity.hodEmail,
      invited_by_name: parent.identity.hodName,
      created_via_submission: parent._id,
      created_at: nowStamp(),
      first_time_login: false,
      can_readiness: false,
      can_closure: false,
      can_iea: false,
    });
  } catch {
    return { ok: false, error: "You already have a login. Log in with it instead." };
  }
  await startSessionFor({ email, name: name.data, picture: "" });
  return { ok: true, redirectTo: `/checklists/${encodeURIComponent(token)}` };
}
