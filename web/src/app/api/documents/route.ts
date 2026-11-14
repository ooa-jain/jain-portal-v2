import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { collections } from "@/lib/db";
import { checkDocument } from "@/lib/doc-check";
import { ensureDocumentIndexes, sha256, storeFile } from "@/lib/doc-store";
import { canChangeDocument, normalizeDocument } from "@/lib/documents";
import { DEPARTMENTS, DOC_EXTENSIONS, DOC_MAX_BYTES, docType } from "@/lib/constants";
import { nowStamp, str } from "@/lib/utils";

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function fail(error: string, status = 400) {
  return Response.json({ ok: false, error }, { status });
}

/**
 * Upload a document to the library. One current copy per department,
 * course, semester and type; a new upload becomes the next version.
 * An identical file already in the library is refused.
 */
export async function POST(request: Request) {
  try {
    return await upload(request);
  } catch (error) {
    console.error("[documents] upload failed:", error);
    return fail("The upload could not be completed. Please try again; if it keeps failing, contact the Office of Academic Affairs.", 500);
  }
}

async function upload(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Please sign in again.", 401);
  if (user.impersonatedBy) return fail("Uploads are disabled while viewing as another user.", 403);

  const form = await request.formData().catch(() => null);
  if (!form) return fail("Invalid upload.");
  const field = (name: string, max = 300) => str(form.get(name)).trim().slice(0, max);

  const dept = user.isAdmin ? field("dept") || user.department : user.department;
  const programme = field("programme", 200);
  const courseCode = field("course_code", 40).toUpperCase().replace(/\s+/g, "");
  const courseName = field("course_name", 300);
  const semester = field("semester", 40);
  const typeKey = field("doc_type", 40);
  const file = form.get("file");

  if (!dept) return fail("Set your department on the Home page before uploading.");
  if (user.isAdmin && !DEPARTMENTS.includes(dept)) return fail("Choose a department.");
  const type = docType(typeKey);
  if (!type) return fail("Choose a document type.");
  if (!courseCode || !/^[A-Z0-9][A-Z0-9-]{1,39}$/.test(courseCode)) return fail("Enter a valid course code, e.g. 22CSE301.");
  if (!courseName) return fail("Enter the course name.");
  if (!semester) return fail("Choose the semester.");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a file to upload.");
  if (file.size > DOC_MAX_BYTES) return fail("The file is larger than 20 MB.");
  const ext = path.extname(file.name).toLowerCase();
  if (!DOC_EXTENSIONS.includes(ext)) return fail("Upload a PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx) or image file.");

  await ensureDocumentIndexes();
  const docs = collections.documents();
  const data = new Uint8Array(await file.arrayBuffer());
  const hash = sha256(data);
  const slot = { dept, course_code: courseCode, semester, doc_type: typeKey };

  // Duplicate prevention: the same file may exist only once in the library.
  const duplicate = await docs.findOne(
    { $or: [{ sha256: hash }, { "history.sha256": hash }] },
    { projection: { text: 0 } },
  );
  if (duplicate) {
    const d = normalizeDocument(duplicate);
    const same = d.dept === dept && d.course_code === courseCode && d.semester === semester && d.doc_type === typeKey;
    if (same && d.sha256 === hash) return fail("This exact file is already the current version of this document. Nothing changed.", 409);
    const where = `${docType(d.doc_type)?.label ?? d.doc_type} for ${d.course_code} (${d.semester})${d.dept !== dept ? `, ${d.dept}` : ""}`;
    return fail(`This exact file is already in the library as the ${where}. Upload the right document instead of a copy.`, 409);
  }

  const existing = await docs.findOne(slot, { projection: { text: 0 } });
  if (existing && !canChangeDocument(user, normalizeDocument(existing))) {
    return fail("This document was uploaded by someone else. Ask them or your HOD to replace it.", 403);
  }

  const check = await checkDocument(data, ext, typeKey, courseCode);
  const filePath = await storeFile(data, ext);
  const now = nowStamp();
  const current = {
    ...slot,
    programme,
    course_name: courseName,
    file_name: file.name.slice(0, 200),
    file_path: filePath,
    mime: MIME[ext] ?? "application/octet-stream",
    size: file.size,
    sha256: hash,
    uploaded_by_email: user.email,
    uploaded_by_name: user.name,
    uploaded_at: now,
    check,
    // A document that failed the check goes back to the uploader instead of to the HOD.
    review: { status: check.status === "failed" ? "not_sent" : "pending", by: "", at: "", remarks: "" },
  };

  if (existing) {
    const previous = normalizeDocument(existing);
    await docs.updateOne(
      { _id: existing._id },
      {
        $set: { ...current, version: previous.version + 1 },
        $push: {
          history: {
            $each: [{
              version: previous.version,
              file_name: previous.file_name,
              file_path: str(existing.file_path),
              sha256: previous.sha256,
              uploaded_at: previous.uploaded_at,
              uploaded_by: previous.uploaded_by_name || previous.uploaded_by_email,
            }],
            $slice: -20,
          },
        } as never,
      },
    );
  } else {
    await docs.insertOne({ ...current, version: 1, history: [], created_at: now });
  }

  const saved = await docs.findOne(slot, { projection: { text: 0 } });
  return Response.json({ ok: true, document: normalizeDocument(saved!) });
}
