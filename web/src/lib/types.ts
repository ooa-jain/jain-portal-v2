import type { FormModuleKey, ModuleKey } from "./constants";

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
  form_type: FormModuleKey;
  identity: Identity;
  hodChecklist: Checklist;
  hodReport: Report;
  _draft: boolean;
  timestamp: string;
  share_token: string;
  edit_count: number;
  edit_request: EditRequest | null;
  faculty_submission_count?: number;
};

export type FacultySubmission = {
  _id: string;
  parent_submission_id: string;
  form_type: FormModuleKey;
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

export type EditRequest = { status: "pending" | "approved"; comment: string; timestamp: string };

export type GlobalSettings = {
  readiness_enabled: boolean;
  closure_enabled: boolean;
  iea_enabled: boolean;
  /** "YYYY-MM-DDTHH:MM" in India time, or "" for no deadline. */
  readiness_deadline: string;
  closure_deadline: string;
  iea_deadline: string;
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
  can_iea: boolean;
  readiness_access_override: boolean;
  closure_access_override: boolean;
  iea_access_override: boolean;
  created_at: string;
  last_login: string;
};

export type AccessRequest = {
  _id: string;
  user_email: string;
  user_name: string;
  module: string;
  module_key: ModuleKey | "";
  comment: string;
  status: string;
  admin_comment: string;
  timestamp: string;
};

export type PortalNotification = { _id: string; title: string; body: string; created_at: string; type: string };

/** What a user may do in one module right now. */
export type ModuleAccess = {
  key: ModuleKey;
  /** Module switched on and the user is permitted to use it. */
  open: boolean;
  deadline: string;
  deadlinePassed: boolean;
  hasOverride: boolean;
  /** May create or change submissions (open, and before the deadline or with late access). */
  canWrite: boolean;
  /** The user's late-access request for this module, if any. */
  request: AccessRequest | null;
};

// ── IEA ──

export type IeaEvidenceDetail = { fileUrl: string; fileName: string; driveLink: string; notes: string };
export type IeaEntry = {
  id: string;
  evidenceTypes: string[];
  evidenceLink: string;
  evidenceMissing: string;
  evidenceDetails: Record<string, IeaEvidenceDetail>;
  /** Section-specific text fields, keyed by field id. */
  [field: string]: unknown;
};
/** year -> section key -> entries */
export type IeaYears = Record<string, Record<string, IeaEntry[]>>;
export type IeaVersion = { version: number; at: string; entries: number; by: string; current?: boolean };
export type IeaSubmission = {
  _id: string;
  school: string;
  department: string;
  level: string;
  acYear: string;
  semester: string;
  years: IeaYears;
  yearCounts: Record<string, number>;
  totalEntries: number;
  submitted: boolean;
  version: number;
  submittedAt: string;
  lastUpdated: string;
  createdAt: string;
  submitterEmail: string;
  submitterName: string;
  versions: IeaVersion[];
};
export type IeaFeedback = { _id: string; like: string; rating: number; comments: string; submitterEmail: string; submitterName: string; createdAt: string };

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };
