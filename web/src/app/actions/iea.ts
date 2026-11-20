"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { collections } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { writeBlockedReason } from "@/lib/access";
import { mergeYears, normYear, ownerFilter } from "@/lib/iea";
import { IEA_YEARS, isValidIeaUnit } from "@/lib/constants";
import { toObjectId } from "@/lib/data";
import type { ActionResult } from "@/lib/types";
import { nowStamp, str } from "@/lib/utils";

const unitSchema = z.object({
  school: z.string().trim(),
  department: z.string().trim(),
  level: z.string().trim(),
  acYear: z.string().trim(),
  years: z.unknown(),
});

export type IeaPayload = { school: string; department: string; level: string; acYear: string; years: unknown };

async function prepare(input: IeaPayload) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Your session has expired. Please sign in again." };
  const blocked = await writeBlockedReason(user, "iea");
  if (blocked) return { ok: false as const, error: blocked };
  const parsed = unitSchema.safeParse(input);
  if (!parsed.success || !isValidIeaUnit(parsed.data.school, parsed.data.department, parsed.data.level)) {
    return { ok: false as const, error: "Choose a valid school, department and programme level." };
  }
  const data = parsed.data;
  const acYear = IEA_YEARS.find((y) => normYear(y) === normYear(data.acYear)) ?? "AY 2025-26";
  // Submissions are personal: one document per person per school / department / level.
  const filter = { school: data.school, department: data.department, level: data.level, ...ownerFilter(user.email) };
  return { ok: true as const, user, data, acYear, filter, years: mergeYears(data.years) };
}

/** Save progress without submitting. */
export async function saveIea(input: IeaPayload): Promise<ActionResult<{ lastUpdated: string }>> {
  const ctx = await prepare(input);
  if (!ctx.ok) return ctx;
  const now = nowStamp();
  await collections.iea().updateOne(
    ctx.filter,
    {
      $set: {
        school: ctx.data.school,
        department: ctx.data.department,
        level: ctx.data.level,
        acYear: ctx.acYear,
        semester: "Odd Semester",
        years: ctx.years,
        lastUpdated: now,
        submitterEmail: ctx.user.email,
        submitterName: ctx.user.name,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  revalidatePath("/iea");
  return { ok: true, lastUpdated: now };
}

/** Submit. Each submission after the first becomes a new version; earlier versions are kept as history. */
export async function submitIea(input: IeaPayload): Promise<ActionResult<{ version: number }>> {
  const ctx = await prepare(input);
  if (!ctx.ok) return ctx;
  const now = nowStamp();
  const existing = await collections.iea().findOne(ctx.filter);

  let history: unknown[] = [];
  let version = 1;
  if (existing?.submitted) {
    history = [
      ...(Array.isArray(existing.history) ? existing.history : []),
      {
        version: Number(existing.version) || 1,
        years: existing.years,
        submittedAt: str(existing.submittedAt) || str(existing.lastUpdated),
        submitterName: str(existing.submitterName),
        submitterEmail: str(existing.submitterEmail),
      },
    ].slice(-20);
    version = (Number(existing.version) || 1) + 1;
  }
  const submittedYears = { ...(existing?.submittedYears ?? {}), [normYear(ctx.acYear)]: now };

  await collections.iea().updateOne(
    ctx.filter,
    {
      $set: {
        school: ctx.data.school,
        department: ctx.data.department,
        level: ctx.data.level,
        acYear: ctx.acYear,
        semester: "Odd Semester",
        years: ctx.years,
        lastUpdated: now,
        submitted: true,
        submittedYears,
        version,
        submittedAt: now,
        history,
        submitterEmail: ctx.user.email,
        submitterName: ctx.user.name,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  revalidatePath("/", "layout");
  return { ok: true, version };
}

export async function deleteIea(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Please sign in again." };
  const _id = toObjectId(id);
  if (!_id) return { ok: false, error: "Submission not found." };
  // Non-admins can delete only their own.
  const result = await collections.iea().deleteOne(user.isAdmin ? { _id } : { _id, ...ownerFilter(user.email) });
  if (result.deletedCount === 0) return { ok: false, error: "Submission not found." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function sendIeaFeedback(input: { like: string; rating: number; comments: string }): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Please sign in again." };
  const like = str(input.like).trim().slice(0, 4000);
  const comments = str(input.comments).trim().slice(0, 4000);
  const rating = Math.max(0, Math.min(10, Math.round(Number(input.rating) || 0)));
  if (!like && !rating && !comments) return { ok: false, error: "Add a rating or a comment before sending." };
  await collections.ieaFeedback().insertOne({
    like, rating, comments, submitterEmail: user.email, submitterName: user.name, createdAt: nowStamp(),
  });
  return { ok: true };
}
