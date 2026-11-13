import "server-only";
import { cache } from "react";
import { ObjectId, type Document, type Filter } from "mongodb";
import { collections } from "./db";
import {
  DEFAULT_SEMESTERS,
  DEFAULT_YEARS,
  HOD_CLOSURE_SECTIONS,
  isModuleKey,
  type ModuleKey,
} from "./constants";
import type {
  Checklist,
  FacultySubmission,
  GlobalSettings,
  Identity,
  PortalUser,
  Report,
  Submission,
} from "./types";
import { str } from "./utils";
import type { CurrentUser } from "./auth";

// ── Settings ────────────────────────────────────────────────────────

export const getSettings = cache(async (): Promise<GlobalSettings> => {
  const doc: Document = (await collections.settings().findOne({ _id: "global" })) ?? {};
  const list = (value: unknown, fallback: string[]) =>
    Array.isArray(value) ? value.map(str).filter(Boolean) : fallback;
  return {
    readiness_enabled: doc.readiness_enabled !== false,
    closure_enabled: doc.closure_enabled !== false,
    enabled_years: list(doc.enabled_years, DEFAULT_YEARS),
    enabled_semesters: list(doc.enabled_semesters, DEFAULT_SEMESTERS),
    admin_emails: list(doc.admin_emails, []).map((e) => e.toLowerCase()),
  };
});

// ── Normalisers: tolerate every legacy shape found in old documents ──

export function toObjectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

function normalizeIdentity(raw: unknown): Identity {
  const i = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    submitterEmail: str(i.submitterEmail),
    submitterName: str(i.submitterName),
    campus: str(i.campus),
    dept: str(i.dept),
    hodName: str(i.hodName) || str(i.hod),
    hodEmail: str(i.hodEmail) || str(i.email),
    semester: str(i.semester) || str(i.sem),
    acYear: str(i.acYear) || str(i.ac_year),
    subDate: str(i.subDate) || str(i.date),
    hodDeadline: str(i.hodDeadline),
  };
}

export function normalizeChecklist(raw: unknown): Checklist {
  const out: Checklist = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
    out[id] = { status: str(v.status), remark: str(v.remark) };
  }
  return out;
}

function normalizeReport(raw: unknown): Report {
  const out: Report = {};
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  for (const section of HOD_CLOSURE_SECTIONS) {
    const value = source[section.id];
    if (value && typeof value === "object") {
      const v = value as Record<string, unknown>;
      out[section.id] = {
        title: section.title,
        text: str(v.text),
        link: str(v.link),
        file_url: str(v.file_url),
      };
    } else {
      // Very old documents stored the narrative as a bare string.
      out[section.id] = { title: section.title, text: str(value), link: "", file_url: "" };
    }
  }
  return out;
}

export function normalizeSubmission(doc: Document): Submission {
  return {
    _id: String(doc._id),
    form_type: isModuleKey(doc.form_type) ? doc.form_type : "readiness",
    identity: normalizeIdentity(doc.identity),
    hodChecklist: normalizeChecklist(doc.hodChecklist),
    hodReport: normalizeReport(doc.hodReport),
    _draft: doc._draft === true,
    timestamp: str(doc.timestamp),
    share_token: str(doc.share_token),
    edit_count: typeof doc.edit_count === "number" ? doc.edit_count : 0,
  };
}

export function normalizeFaculty(doc: Document): FacultySubmission {
  return {
    _id: String(doc._id),
    parent_submission_id: str(doc.parent_submission_id),
    form_type: isModuleKey(doc.form_type) ? doc.form_type : "readiness",
    dept: str(doc.dept),
    campus: str(doc.campus),
    semester: str(doc.semester),
    ac_year: str(doc.ac_year),
    hod_name: str(doc.hod_name),
    hod_email: str(doc.hod_email),
    faculty_name: str(doc.faculty_name),
    faculty_email: str(doc.faculty_email),
    course_name: str(doc.course_name),
    course_code: str(doc.course_code),
    program: str(doc.program),
    year_sem: str(doc.year_sem),
    no_of_students: str(doc.no_of_students),
    checklist: normalizeChecklist(doc.checklist),
    hod_remarks: str(doc.hod_remarks),
    hod_review_status: str(doc.hod_review_status) || "pending",
    timestamp: str(doc.timestamp),
    reviewed_at: str(doc.reviewed_at) || undefined,
  };
}

export function normalizeUser(doc: Document, adminEmails: Set<string>): PortalUser {
  const email = str(doc.email).toLowerCase();
  return {
    _id: String(doc._id),
    email,
    name: str(doc.name),
    department: str(doc.department),
    picture: str(doc.picture),
    is_admin: adminEmails.has(email) || doc.is_admin === true || doc.role === "admin",
    can_readiness: doc.can_readiness !== false,
    can_closure: doc.can_closure !== false,
    created_at: str(doc.created_at),
    last_login: str(doc.last_login),
  };
}

// ── Access rules ────────────────────────────────────────────────────

/** A user may open a submission they made, one from their own department, or any if admin. */
export function canViewSubmission(user: CurrentUser, sub: Submission): boolean {
  if (user.isAdmin) return true;
  if (sub.identity.submitterEmail.toLowerCase() === user.email) return true;
  return Boolean(user.department) && sub.identity.dept === user.department;
}

/** Only the submitter (or an admin) may change or delete a submission. */
export function canEditSubmission(user: CurrentUser, sub: Submission): boolean {
  return user.isAdmin || sub.identity.submitterEmail.toLowerCase() === user.email;
}

// ── Queries ─────────────────────────────────────────────────────────

export async function getSubmission(id: string): Promise<Submission | null> {
  const _id = toObjectId(id);
  if (!_id) return null;
  const doc = await collections.submissions().findOne({ _id });
  return doc ? normalizeSubmission(doc) : null;
}

export async function getSubmissionByToken(token: string): Promise<Submission | null> {
  if (!token) return null;
  const doc = await collections.submissions().findOne({ share_token: token });
  return doc ? normalizeSubmission(doc) : null;
}

async function facultyCounts(parentIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (parentIds.length === 0) return counts;
  const rows = await collections
    .facultySubmissions()
    .aggregate([
      { $match: { parent_submission_id: { $in: parentIds } } },
      { $group: { _id: "$parent_submission_id", count: { $sum: 1 } } },
    ])
    .toArray();
  for (const row of rows) counts.set(String(row._id), Number(row.count));
  return counts;
}

async function listSubmissions(filter: Filter<Document>): Promise<Submission[]> {
  const docs = await collections.submissions().find(filter).sort({ timestamp: -1 }).toArray();
  const subs = docs.map(normalizeSubmission);
  const counts = await facultyCounts(subs.map((s) => s._id));
  for (const sub of subs) sub.faculty_submission_count = counts.get(sub._id) ?? 0;
  return subs;
}

/** Submissions the user made, plus those from their department. */
export function listMySubmissions(user: CurrentUser, module?: ModuleKey) {
  const scope: Filter<Document> = user.department
    ? { $or: [{ "identity.submitterEmail": user.email }, { "identity.dept": user.department }] }
    : { "identity.submitterEmail": user.email };
  return listSubmissions(module ? { ...scope, form_type: module } : scope);
}

export function listAllSubmissions() {
  return listSubmissions({ form_type: { $in: ["readiness", "closure"] } });
}

export async function listFacultySubmissions(parentId: string): Promise<FacultySubmission[]> {
  const docs = await collections
    .facultySubmissions()
    .find({ parent_submission_id: parentId })
    .sort({ timestamp: -1 })
    .toArray();
  return docs.map(normalizeFaculty);
}

export async function listFacultyForParents(
  parentIds: string[],
): Promise<Map<string, FacultySubmission[]>> {
  const map = new Map<string, FacultySubmission[]>();
  if (parentIds.length === 0) return map;
  const docs = await collections
    .facultySubmissions()
    .find({ parent_submission_id: { $in: parentIds } })
    .toArray();
  for (const doc of docs) {
    const fac = normalizeFaculty(doc);
    const list = map.get(fac.parent_submission_id) ?? [];
    list.push(fac);
    map.set(fac.parent_submission_id, list);
  }
  return map;
}
