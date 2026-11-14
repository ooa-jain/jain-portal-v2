import "server-only";
import type { Document, Filter } from "mongodb";
import { collections } from "./db";
import { toObjectId } from "./data";
import type { CurrentUser } from "./auth";
import type { DocCheck, DocReview, LibraryDocument } from "./types";
import { formatDate, parseStamp, str } from "./utils";

export function normalizeDocument(doc: Document): LibraryDocument {
  const check = (doc.check ?? {}) as Record<string, unknown>;
  const review = (doc.review ?? {}) as Record<string, unknown>;
  return {
    _id: String(doc._id),
    dept: str(doc.dept),
    programme: str(doc.programme),
    course_code: str(doc.course_code),
    course_name: str(doc.course_name),
    semester: str(doc.semester),
    doc_type: str(doc.doc_type),
    file_name: str(doc.file_name),
    mime: str(doc.mime),
    size: Number(doc.size) || 0,
    sha256: str(doc.sha256),
    version: Number(doc.version) || 1,
    uploaded_by_email: str(doc.uploaded_by_email),
    uploaded_by_name: str(doc.uploaded_by_name),
    uploaded_at: str(doc.uploaded_at),
    check: {
      status: (["passed", "warnings", "failed"].includes(str(check.status)) ? check.status : "warnings") as DocCheck["status"],
      notes: Array.isArray(check.notes) ? check.notes.map(str) : [],
      pages: Number(check.pages) || 0,
      textChars: Number(check.textChars) || 0,
      courseCodeFound: check.courseCodeFound === true,
    },
    review: {
      status: (["pending", "approved", "returned", "not_sent"].includes(str(review.status)) ? review.status : "pending") as DocReview["status"],
      by: str(review.by),
      at: str(review.at),
      remarks: str(review.remarks),
    },
    history: Array.isArray(doc.history)
      ? doc.history.map((h: Record<string, unknown>) => ({
          version: Number(h.version) || 1,
          file_name: str(h.file_name),
          sha256: str(h.sha256),
          uploaded_at: str(h.uploaded_at),
          uploaded_by: str(h.uploaded_by),
        }))
      : [],
  };
}

/** Everyone sees their own department's library; admins see all. */
export function scopeFilter(user: CurrentUser, dept?: string): Filter<Document> {
  if (user.isAdmin) return dept ? { dept } : {};
  if (!user.department) return { uploaded_by_email: user.email };
  return { dept: user.department };
}

export function canViewDocument(user: CurrentUser, doc: LibraryDocument) {
  return user.isAdmin || doc.uploaded_by_email === user.email || (Boolean(user.department) && doc.dept === user.department);
}

/** The HOD (a non-faculty account in the department) or an admin approves documents. */
export function canReviewDocument(user: CurrentUser, doc: LibraryDocument) {
  return user.isAdmin || (!user.isFaculty && Boolean(user.department) && doc.dept === user.department);
}

/** The uploader, the HOD or an admin may replace or delete a document. */
export function canChangeDocument(user: CurrentUser, doc: LibraryDocument) {
  return doc.uploaded_by_email === user.email || canReviewDocument(user, doc);
}

export async function listDocuments(filter: Filter<Document>): Promise<LibraryDocument[]> {
  const docs = await collections
    .documents()
    .find(filter, { projection: { text: 0 } })
    .sort({ programme: 1, course_code: 1, semester: -1, doc_type: 1 })
    .toArray();
  return docs.map(normalizeDocument);
}

export async function getDocument(id: string): Promise<LibraryDocument | null> {
  const _id = toObjectId(id);
  if (!_id) return null;
  const doc = await collections.documents().findOne({ _id }, { projection: { text: 0 } });
  return doc ? normalizeDocument(doc) : null;
}

export type CourseRef = { programme: string; course_code: string; course_name: string };

/**
 * Courses already known in a department: from its library and from faculty
 * checklist responses, so faculty pick a course instead of retyping it.
 */
export async function knownCourses(dept: string): Promise<CourseRef[]> {
  if (!dept) return [];
  const [docs, faculty] = await Promise.all([
    collections.documents().find({ dept }, { projection: { programme: 1, course_code: 1, course_name: 1 } }).toArray(),
    collections.facultySubmissions().find({ dept }, { projection: { program: 1, course_code: 1, course_name: 1 } }).toArray(),
  ]);
  const map = new Map<string, CourseRef>();
  for (const d of [...docs.map((d) => ({ programme: str(d.programme), course_code: str(d.course_code), course_name: str(d.course_name) })),
    ...faculty.map((f) => ({ programme: str(f.program), course_code: str(f.course_code), course_name: str(f.course_name) }))]) {
    const code = d.course_code.trim().toUpperCase();
    if (code && !map.has(code)) map.set(code, { ...d, course_code: code });
  }
  return [...map.values()].sort((a, b) => a.course_code.localeCompare(b.course_code));
}

/** For a faculty checklist: which items are already answered by documents on file. */
export async function documentsForCourse(dept: string, courseCode: string, semester: string) {
  if (!dept || !courseCode) return [];
  return listDocuments({
    dept,
    course_code: courseCode.trim().toUpperCase(),
    ...(semester ? { semester } : {}),
    "check.status": { $ne: "failed" },
  });
}

/** Uploads in each of the last `count` weeks, oldest first. */
export function weeklyUploads(docs: LibraryDocument[], count = 8) {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const end = now - i * 7 * 86_400_000;
    const start = end - 7 * 86_400_000;
    const uploads = docs.filter((d) => {
      const t = parseStamp(d.uploaded_at)?.getTime() ?? 0;
      return t > start && t <= end;
    }).length;
    return { label: formatDate(new Date(start + 86_400_000).toISOString()).replace(/ \d{4}$/, ""), count: uploads };
  }).reverse();
}
