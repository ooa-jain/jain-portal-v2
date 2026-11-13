import type { ModuleKey } from "./constants";

/** Shapes below mirror the documents the old portal stored in MongoDB. */

export type Identity = {
  submitterEmail: string;
  submitterName: string;
  campus: string;
  dept: string;
  hodName: string;
  hodEmail: string;
  semester: string;
  acYear: string;
  subDate: string;
  hodDeadline: string;
};

export type ChecklistAnswer = { status: string; remark: string };
export type Checklist = Record<string, ChecklistAnswer>;

export type ReportAnswer = { title: string; text: string; link: string; file_url: string };
export type Report = Record<string, ReportAnswer>;

export type Submission = {
  _id: string;
  form_type: ModuleKey;
  identity: Identity;
  hodChecklist: Checklist;
  hodReport: Report;
  _draft: boolean;
  timestamp: string;
  share_token: string;
  edit_count: number;
  faculty_submission_count?: number;
};

export type FacultySubmission = {
  _id: string;
  parent_submission_id: string;
  form_type: ModuleKey;
  dept: string;
  campus: string;
  semester: string;
  ac_year: string;
  hod_name: string;
  hod_email: string;
  faculty_name: string;
  faculty_email: string;
  course_name: string;
  course_code: string;
  program: string;
  year_sem: string;
  no_of_students: string;
  checklist: Checklist;
  hod_remarks: string;
  hod_review_status: string;
  timestamp: string;
  reviewed_at?: string;
};

export type GlobalSettings = {
  readiness_enabled: boolean;
  closure_enabled: boolean;
  enabled_years: string[];
  enabled_semesters: string[];
  admin_emails: string[];
};

export type PortalUser = {
  _id: string;
  email: string;
  name: string;
  department: string;
  picture: string;
  is_admin: boolean;
  can_readiness: boolean;
  can_closure: boolean;
  created_at: string;
  last_login: string;
};

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };
