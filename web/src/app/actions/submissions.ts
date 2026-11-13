"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { collections } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  canEditSubmission,
  getSettings,
  getSubmission,
  toObjectId,
} from "@/lib/data";
import {
  CAMPUSES,
  DEPARTMENTS,
  HOD_CLOSURE_SECTIONS,
  HOD_SECTIONS,
  MODULES,
} from "@/lib/constants";
import type { ActionResult } from "@/lib/types";
import { nowStamp } from "@/lib/utils";

const text = (max: number) => z.string().trim().max(max).default("");

const identitySchema = z.object({
  campus: text(40),
  dept: text(200),
  hodName: text(200),
  hodEmail: text(200),
  semester: text(40),
  acYear: text(20),
  subDate: text(20),
  hodDeadline: text(20),
});

const payloadSchema = z.object({
  id: z.string().optional(),
  form_type: z.enum(["readiness", "closure"]),
  draft: z.boolean(),
  identity: identitySchema,
  hodChecklist: z.record(z.string(), z.object({ status: text(40), remark: text(2000) })).default({}),
  hodReport: z
    .record(z.string(), z.object({ text: text(20000), link: text(2000), file_url: text(500) }))
    .default({}),
});

export type SubmissionPayload = z.input<typeof payloadSchema>;

export async function saveSubmission(
  input: SubmissionPayload,
): Promise<ActionResult<{ id: string; shareToken: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Please sign in again." };

  const parsed = payloadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Some fields are invalid. Please review the form." };
  const data = parsed.data;

  const meta = MODULES[data.form_type];
  const settings = await getSettings();
  const allowed = user.isAdmin || (settings[meta.enabledKey] && (data.form_type === "readiness" ? user.canReadiness : user.canClosure));
  if (!allowed) return { ok: false, error: `${meta.label} is not open for you right now.` };

  // A final submission needs the identifying details; a draft can be partial.
  if (!data.draft) {
    const i = data.identity;
    if (!CAMPUSES.includes(i.campus)) return { ok: false, error: "Select a campus." };
    if (!DEPARTMENTS.includes(i.dept)) return { ok: false, error: "Select a department." };
    if (!i.hodName || !i.hodEmail) return { ok: false, error: "Enter the HOD name and email." };
    if (!i.semester || !i.acYear) return { ok: false, error: "Select the semester and academic year." };
  }

  // Keep only known item ids so stray keys can never be written.
  const hodChecklist: Record<string, { status: string; remark: string }> = {};
  const hodReport: Record<string, { title: string; text: string; link: string; file_url: string }> = {};
  if (data.form_type === "readiness") {
    for (const item of HOD_SECTIONS.flatMap((s) => s.items)) {
      hodChecklist[item.id] = data.hodChecklist[item.id] ?? { status: "", remark: "" };
    }
  } else {
    for (const section of HOD_CLOSURE_SECTIONS) {
      const answer = data.hodReport[section.id] ?? { text: "", link: "", file_url: "" };
      hodReport[section.id] = { title: section.title, ...answer };
    }
  }

  const submissions = collections.submissions();
  const timestamp = nowStamp();

  if (data.id) {
    const existing = await getSubmission(data.id);
    if (!existing) return { ok: false, error: "This submission no longer exists." };
    if (!canEditSubmission(user, existing)) {
      return { ok: false, error: "Only the person who created this submission can change it." };
    }
    if (existing.form_type !== data.form_type) return { ok: false, error: "Form type mismatch." };

    const shareToken = existing.share_token || randomBytes(16).toString("base64url");
    const wasFinal = !existing._draft;
    await submissions.updateOne(
      { _id: toObjectId(existing._id)! },
      {
        $set: {
          // Submitter fields stay with the original owner, even when an admin edits.
          identity: {
            submitterEmail: existing.identity.submitterEmail || user.email,
            submitterName: existing.identity.submitterName || user.name,
            ...data.identity,
          },
          programs: [],
          ...(data.form_type === "readiness" ? { hodChecklist } : { hodReport }),
          form_type: data.form_type,
          // Once submitted, a later "save draft" must not turn it back into a draft.
          _draft: wasFinal ? false : data.draft,
          timestamp,
          share_token: shareToken,
          edit_count: existing.edit_count + (wasFinal && !data.draft ? 1 : 0),
        },
      },
    );
    revalidatePath("/", "layout");
    return { ok: true, id: existing._id, shareToken };
  }

  const shareToken = randomBytes(16).toString("base64url");
  const result = await submissions.insertOne({
    identity: { submitterEmail: user.email, submitterName: user.name, ...data.identity },
    programs: [],
    ...(data.form_type === "readiness" ? { hodChecklist } : { hodReport }),
    form_type: data.form_type,
    _draft: data.draft,
    timestamp,
    share_token: shareToken,
    edit_count: 0,
  });
  revalidatePath("/", "layout");
  return { ok: true, id: String(result.insertedId), shareToken };
}

export async function deleteSubmission(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Please sign in again." };
  const existing = await getSubmission(id);
  if (!existing) return { ok: false, error: "This submission no longer exists." };
  if (!canEditSubmission(user, existing)) {
    return { ok: false, error: "Only the person who created this submission can delete it." };
  }
  await collections.submissions().deleteOne({ _id: toObjectId(id)! });
  await collections.facultySubmissions().deleteMany({ parent_submission_id: id });
  revalidatePath("/", "layout");
  return { ok: true };
}
