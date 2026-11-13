"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { collections } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  canEditSubmission,
  canViewSubmission,
  getSubmission,
  getSubmissionByToken,
  toObjectId,
} from "@/lib/data";
import { MODULES, facultySectionsFor } from "@/lib/constants";
import { env } from "@/lib/env";
import { publicBaseUrl } from "@/lib/base-url";
import { esc, sendEmail } from "@/lib/mail";
import type { ActionResult } from "@/lib/types";
import { nowStamp } from "@/lib/utils";

const text = (max: number) => z.string().trim().max(max).default("");

const facultySchema = z.object({
  shareToken: z.string().min(1),
  facultyName: z.string().trim().min(1).max(200),
  facultyEmail: z.string().trim().toLowerCase().email().max(200),
  courses: z
    .array(
      z.object({
        courseName: z.string().trim().min(1).max(300),
        courseCode: z.string().trim().min(1).max(60),
        program: text(200),
        yearSem: text(60),
        noOfStudents: text(20),
      }),
    )
    .min(1)
    .max(20),
  checklist: z.record(z.string(), z.object({ status: text(10), remark: text(2000) })),
});

export type FacultyPayload = z.input<typeof facultySchema>;

/** Public: faculty submit their checklist through the HOD's share link. No sign-in. */
export async function submitFacultyChecklist(
  input: FacultyPayload,
): Promise<ActionResult<{ saved: number }>> {
  const parsed = facultySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Enter your name, a valid email, and a name and code for every course." };
  }
  const data = parsed.data;

  const parent = await getSubmissionByToken(data.shareToken);
  if (!parent) return { ok: false, error: "This link is no longer valid. Ask your HOD for a new one." };

  const checklist: Record<string, { status: string; remark: string }> = {};
  for (const item of facultySectionsFor(parent.form_type).flatMap((s) => s.items)) {
    checklist[item.id] = data.checklist[item.id] ?? { status: "", remark: "" };
  }

  const faculty = collections.facultySubmissions();
  for (const course of data.courses) {
    const doc = {
      parent_submission_id: parent._id,
      share_token: data.shareToken,
      form_type: parent.form_type,
      dept: parent.identity.dept,
      campus: parent.identity.campus,
      semester: parent.identity.semester,
      ac_year: parent.identity.acYear,
      hod_name: parent.identity.hodName,
      hod_email: parent.identity.hodEmail,
      faculty_name: data.facultyName,
      faculty_email: data.facultyEmail,
      course_name: course.courseName,
      course_code: course.courseCode,
      program: course.program,
      year_sem: course.yearSem,
      no_of_students: course.noOfStudents,
      checklist,
      hod_remarks: "",
      hod_review_status: "pending",
      timestamp: nowStamp(),
    };
    // Re-submitting the same course replaces the earlier response.
    await faculty.updateOne(
      {
        parent_submission_id: parent._id,
        faculty_email: data.facultyEmail,
        course_code: course.courseCode,
      },
      { $set: doc },
      { upsert: true },
    );
  }

  const label = MODULES[parent.form_type].label;
  const courseList = data.courses.map((c) => `${esc(c.courseName)} (${esc(c.courseCode)})`).join(", ");
  // Emails are a courtesy; a mail failure must not fail the submission.
  await Promise.all([
    parent.identity.hodEmail
      ? sendEmail(
          parent.identity.hodEmail,
          `Faculty ${label} checklist received — ${data.facultyName}`,
          `<p>Dear ${esc(parent.identity.hodName || "HOD")},</p>
           <p><strong>${esc(data.facultyName)}</strong> has submitted the faculty ${esc(label)} checklist for: ${courseList}.</p>
           <p>Sign in to the portal to review it.</p>`,
        )
      : Promise.resolve(false),
    sendEmail(
      data.facultyEmail,
      `Your ${label} checklist was received`,
      `<p>Dear ${esc(data.facultyName)},</p>
       <p>Your faculty ${esc(label)} checklist for ${courseList} has been received and shared with your HOD.</p>`,
    ),
  ]);

  return { ok: true, saved: data.courses.length };
}

async function loadFacultyForUser(facultyId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Your session has expired. Please sign in again." };
  const _id = toObjectId(facultyId);
  if (!_id) return { ok: false as const, error: "Faculty response not found." };
  const doc = await collections.facultySubmissions().findOne({ _id });
  if (!doc) return { ok: false as const, error: "Faculty response not found." };
  const parent = await getSubmission(String(doc.parent_submission_id));
  if (!parent) return { ok: false as const, error: "The HOD submission for this response no longer exists." };
  return { ok: true as const, user, _id, parent };
}

export async function reviewFaculty(
  facultyId: string,
  status: "pending" | "reviewed" | "needs_changes",
  remarks: string,
): Promise<ActionResult> {
  const ctx = await loadFacultyForUser(facultyId);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!canViewSubmission(ctx.user, ctx.parent)) return { ok: false, error: "You cannot review this response." };

  await collections.facultySubmissions().updateOne(
    { _id: ctx._id },
    {
      $set: {
        hod_remarks: remarks.trim().slice(0, 4000),
        hod_review_status: status,
        reviewed_at: nowStamp(),
      },
    },
  );
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteFaculty(facultyId: string): Promise<ActionResult> {
  const ctx = await loadFacultyForUser(facultyId);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!canEditSubmission(ctx.user, ctx.parent)) return { ok: false, error: "You cannot delete this response." };

  await collections.facultySubmissions().deleteOne({ _id: ctx._id });
  revalidatePath("/", "layout");
  return { ok: true };
}

const recipientsSchema = z
  .array(z.object({ name: text(200), email: z.string().trim().toLowerCase().email().max(200) }))
  .min(1)
  .max(100);

/** Email the faculty share link to a list of recipients. */
export async function sendFacultyLink(
  submissionId: string,
  recipients: { name: string; email: string }[],
): Promise<ActionResult<{ sent: string[]; failed: string[] }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Please sign in again." };
  const sub = await getSubmission(submissionId);
  if (!sub || !canEditSubmission(user, sub)) return { ok: false, error: "Submission not found." };
  if (!sub.share_token) return { ok: false, error: "Save the form first to create a faculty link." };

  const parsed = recipientsSchema.safeParse(recipients);
  if (!parsed.success) return { ok: false, error: "Enter at least one valid email address." };
  if (!env.mail) return { ok: false, error: "Email is not set up on the server. Copy the link and share it yourself." };

  const url = `${await publicBaseUrl()}/faculty-form/${sub.share_token}`;
  const label = MODULES[sub.form_type].label;
  const sent: string[] = [];
  const failed: string[] = [];
  for (const recipient of parsed.data) {
    const ok = await sendEmail(
      recipient.email,
      `Faculty ${label} checklist — ${sub.identity.dept} (${sub.identity.semester})`,
      `<p>Dear ${esc(recipient.name || "Faculty")},</p>
       <p><strong>${esc(sub.identity.hodName)}</strong>, Head of <strong>${esc(sub.identity.dept)}</strong>, has asked you to fill the faculty
       ${esc(label)} checklist for <strong>${esc(sub.identity.semester)}</strong>${sub.identity.hodDeadline ? ` by <strong>${esc(sub.identity.hodDeadline)}</strong>` : ""}.</p>
       <p><a href="${url}" style="display:inline-block;background:#0a2558;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700">Open checklist</a></p>
       <p style="font-size:12px;color:#5b6785;word-break:break-all">${url}</p>`,
    );
    (ok ? sent : failed).push(recipient.email);
  }
  return { ok: true, sent, failed };
}
