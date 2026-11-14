"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { collections } from "@/lib/db";
import { toObjectId } from "@/lib/data";
import { canChangeDocument, canReviewDocument, getDocument } from "@/lib/documents";
import type { ActionResult } from "@/lib/types";
import { nowStamp } from "@/lib/utils";

/** HOD or admin: approve a document, or return it to the uploader with remarks. */
export async function reviewDocument(id: string, decision: "approved" | "returned", remarks: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Please sign in again." };
  const doc = await getDocument(id);
  if (!doc) return { ok: false, error: "Document not found." };
  if (!canReviewDocument(user, doc)) return { ok: false, error: "Only the HOD or the Office of Academic Affairs can review this document." };
  if (decision === "returned" && !remarks.trim()) return { ok: false, error: "Say what needs to change before returning it." };

  await collections.documents().updateOne(
    { _id: toObjectId(id)! },
    { $set: { review: { status: decision, by: user.name || user.email, at: nowStamp(), remarks: remarks.trim().slice(0, 2000) } } },
  );
  revalidatePath("/documents");
  revalidatePath("/analytics");
  return { ok: true };
}

/** Uploader, HOD or admin: remove a document (all its versions) from the library. */
export async function deleteDocument(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Please sign in again." };
  const doc = await getDocument(id);
  if (!doc) return { ok: false, error: "Document not found." };
  if (!canChangeDocument(user, doc)) return { ok: false, error: "You cannot delete this document." };
  await collections.documents().deleteOne({ _id: toObjectId(id)! });
  revalidatePath("/documents");
  revalidatePath("/analytics");
  return { ok: true };
}
