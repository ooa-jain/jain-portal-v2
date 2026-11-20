import "server-only";
import { collections } from "./db";
import { MODULES, type FormModuleKey } from "./constants";
import type { Checklist, Submission } from "./types";
import { formatDate, str } from "./utils";

export type PrefillCourse = { courseName: string; courseCode: string; program: string; yearSem: string; noOfStudents: string };
export type Prefill = { label: string; courses: PrefillCourse[]; checklist: Checklist | null };

/** "Odd 2026-27" already names the year; add the academic year only when it does not. */
function semesterLabel(semester: string, acYear: string) {
  if (!semester) return acYear;
  return acYear && !semester.includes(acYear) ? `${semester} ${acYear}` : semester;
}

function toCourse(doc: Record<string, unknown>): PrefillCourse {
  return {
    courseName: str(doc.course_name),
    courseCode: str(doc.course_code),
    program: str(doc.program),
    yearSem: str(doc.year_sem),
    noOfStudents: str(doc.no_of_students),
  };
}

/**
 * A signed-in faculty member's answers to reuse on a checklist link:
 * `current` is what they already sent for this link (they are editing it);
 * `previous` is their most recent response to an earlier link. Answers carry
 * over only between checklists of the same kind; courses always do.
 */
export async function facultyPrefills(email: string, parent: Submission): Promise<{ current: Prefill | null; previous: Prefill | null }> {
  const faculty = collections.facultySubmissions();
  const mine = await faculty.find({ parent_submission_id: parent._id, faculty_email: email }).sort({ timestamp: -1 }).toArray();
  const current: Prefill | null = mine.length
    ? { label: `your response to this link (${formatDate(str(mine[0].timestamp))})`, courses: mine.map(toCourse), checklist: (mine[0].checklist as Checklist) ?? null }
    : null;

  const last = await faculty.find({ faculty_email: email, parent_submission_id: { $ne: parent._id } }).sort({ timestamp: -1 }).limit(1).next();
  let previous: Prefill | null = null;
  if (last) {
    const sameRound = await faculty.find({ faculty_email: email, parent_submission_id: last.parent_submission_id }).toArray();
    const kind = str(last.form_type) as FormModuleKey;
    previous = {
      label: `${MODULES[kind]?.label ?? "Checklist"} · ${semesterLabel(str(last.semester), str(last.ac_year))} (${formatDate(str(last.timestamp))})`,
      courses: sameRound.map(toCourse),
      checklist: kind === parent.form_type ? ((last.checklist as Checklist) ?? null) : null,
    };
  }
  return { current, previous };
}
