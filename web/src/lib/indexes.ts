import "server-only";
import type { IndexDescription } from "mongodb";
import { collections } from "./db";
import { ensureDocumentIndexes } from "./doc-store";

/**
 * Indexes for every query the portal runs, so pages stay fast with hundreds of
 * thousands of users and records. Created at server start (instrumentation.ts);
 * creating an index that already exists is a no-op. A failure is logged and
 * does not stop the app (for example, duplicate emails blocking a unique index).
 */
const INDEXES: [() => ReturnType<typeof collections.users>, IndexDescription[]][] = [
  [collections.users, [
    { key: { email: 1 }, name: "email_unique", unique: true },
    { key: { role: 1, department: 1 }, name: "role_dept" },
    { key: { department: 1 }, name: "dept" },
    { key: { created_at: -1 }, name: "newest" },
  ]],
  [collections.submissions, [
    { key: { "identity.submitterEmail": 1, timestamp: -1 }, name: "by_submitter" },
    { key: { "identity.dept": 1, timestamp: -1 }, name: "by_dept" },
    { key: { "identity.semester": 1, "identity.dept": 1 }, name: "by_semester" },
    { key: { share_token: 1 }, name: "by_share_token", partialFilterExpression: { share_token: { $type: "string" } } },
    { key: { form_type: 1, _draft: 1, "identity.submitterEmail": 1 }, name: "submitted_by_module" },
    { key: { "edit_request.status": 1 }, name: "edit_requests" },
    { key: { timestamp: -1 }, name: "newest" },
  ]],
  [collections.facultySubmissions, [
    { key: { parent_submission_id: 1, faculty_email: 1, course_code: 1 }, name: "one_per_course" },
    { key: { faculty_email: 1, timestamp: -1 }, name: "by_faculty" },
    { key: { dept: 1, timestamp: -1 }, name: "by_dept" },
  ]],
  [collections.documents, [
    { key: { dept: 1, semester: 1 }, name: "dept_semester" },
    { key: { uploaded_by_email: 1, uploaded_at: -1 }, name: "by_uploader" },
    { key: { dept: 1, "review.status": 1 }, name: "dept_review" },
    { key: { "review.status": 1 }, name: "review" },
    { key: { uploaded_at: -1 }, name: "newest" },
  ]],
  [collections.iea, [{ key: { submitterEmail: 1 }, name: "by_submitter" }]],
  [collections.notifications, [{ key: { created_at: -1 }, name: "newest" }]],
  [collections.accessRequests, [
    { key: { status: 1 }, name: "status" },
    { key: { user_email: 1 }, name: "by_user" },
  ]],
  [collections.facultySignups, [{ key: { email: 1 }, name: "email_unique", unique: true }]],
];

let started: Promise<void> | null = null;

export function ensureIndexes(): Promise<void> {
  started ??= (async () => {
    for (const [collection, indexes] of INDEXES) {
      for (const index of indexes) {
        try {
          await collection().createIndexes([index]);
        } catch (error) {
          console.error(`[indexes] could not create ${collection().collectionName}.${index.name}:`, (error as Error).message);
        }
      }
    }
    try {
      await ensureDocumentIndexes();
    } catch (error) {
      console.error("[indexes] document library indexes:", (error as Error).message);
    }
    console.log("[indexes] ready");
  })();
  return started;
}
