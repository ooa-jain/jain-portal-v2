"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { collections } from "@/lib/db";
import { toObjectId } from "@/lib/data";
import { canChangeDocument, canReviewDocument, getDocument } from "@/lib/documents";
import type { ActionResult } from "@/lib/types";
import { nowStamp } from "@/lib/utils";
import { docType } from "@/lib/constants";
import { esc, sendEmail } from "@/lib/mail";
import { publicBaseUrl } from "@/lib/base-url";

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

  // Tell the uploader (not when they reviewed their own upload). A mail failure does not undo the review.
  if (doc.uploaded_by_email && doc.uploaded_by_email !== user.email) {
    const label = docType(doc.doc_type)?.label ?? "document";
    const url = `${await publicBaseUrl()}/documents`;
    await sendEmail(
      doc.uploaded_by_email,
      decision === "approved" ? `Approved: ${label} for ${doc.course_code}` : `Returned: ${label} for ${doc.course_code} needs changes`,
      `<p>Dear ${esc(doc.uploaded_by_name || "Faculty")},</p>
       <p>Your <strong>${esc(label)}</strong> for <strong>${esc(doc.course_code)}</strong> (${esc(doc.semester)}) was
       <strong>${decision === "approved" ? "approved" : "returned for changes"}</strong> by ${esc(user.name || user.email)}.</p>
       ${remarks.trim() ? `<p><strong>Remarks:</strong> ${esc(remarks.trim())}</p>` : ""}
       ${decision === "returned" ? `<p>Upload a corrected version in the <a href="${url}">Document Library</a>.</p>` : ""}`,
    );
  }
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
