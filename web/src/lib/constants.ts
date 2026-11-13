/**
 * Form definitions. Item ids and wording are the same as the old portal so
 * existing submissions in the database line up with these checklists.
 */

export type ModuleKey = "readiness" | "closure";

export const MODULES: Record<
  ModuleKey,
  {
    key: ModuleKey;
    label: string;
    short: string;
    description: string;
    enabledKey: "readiness_enabled" | "closure_enabled";
    permissionField: "can_readiness" | "can_closure";
  }
> = {
  readiness: {
    key: "readiness",
    label: "Semester Readiness",
    short: "Readiness",
    description:
      "Confirm the department is ready before the semester starts: curriculum, faculty allocation, timetable, LMS and approvals.",
    enabledKey: "readiness_enabled",
    permissionField: "can_readiness",
  },
  closure: {
    key: "closure",
    label: "Semester Closure",
    short: "Closure",
    description:
      "Report how the semester went: course completion, student performance, events, audits and action items.",
    enabledKey: "closure_enabled",
    permissionField: "can_closure",
  },
};

export const MODULE_KEYS: ModuleKey[] = ["readiness", "closure"];

export function isModuleKey(value: unknown): value is ModuleKey {
  return value === "readiness" || value === "closure";
}

export const CAMPUSES = ["Bangalore", "Kochi", "ODL", "Online"];

export const DEFAULT_YEARS = ["2024-25", "2025-26", "2026-27", "2027-28"];
export const DEFAULT_SEMESTERS = ["Even", "Odd"];

export const DEPARTMENTS = [
  "Office of Academic Affairs",
  "Office of Academic",
  "Department of Computer Science and Engineering",
  "Department of Information Science and Engineering",
  "Department of Aerospace Engineering",
  "Department of Civil Engineering",
  "Department of Mechanical Engineering",
  "Department of Electrical and Electronics Engineering",
  "Department of Electronics and Communication Engineering",
  "Department of Food Technology",
  "Department of Humanities & Social Sciences",
  "Department of CERSSE",
  "Department of SSER",
  "Department of Jainology",
  "Department of Marine Science",
  "Department of Economics",
  "Department of Performing Arts and Cultural Studies",
  "Department of Languages",
  "Department of Journalism and Mass Communication",
  "Department of Law",
  "Department of Chemistry and Biochemistry",
  "Department of Biotechnology and Genetics",
  "Department of Microbiology and Botany",
  "Department of Data Analytics and Mathematical Science",
  "Department of Forensic Science",
  "Department of Physics and Electronics",
  "Department of Psychology and Allied Sciences",
  "Department of Allied Healthcare and Sciences",
  "Department of Computer Science and IT",
  "Department of Animation and Virtual Reality",
  "Department of Commerce",
  "Department of Management Studies",
  "Department of Design",
  "Department of Art and Design",
];

export type ChecklistItem = { id: string; text: string };
export type ChecklistSection = { title: string; items: ChecklistItem[] };

/** Readiness item 28 holds a date (the mid-semester review date), not Yes/No. */
export const MID_SEM_ITEM_ID = "28";

export const HOD_SECTIONS: ChecklistSection[] = [
  {
    title: "Section 1: Curriculum & Course Matrix",
    items: [
      { id: "1", text: "Previous semester's closing report insights incorporated" },
      { id: "2", text: "Course matrix verified (codes, credits, CBCS, LTPE) against BoS docs" },
      { id: "3", text: "Course matrix uploaded on ERP" },
      { id: "4", text: "Open Elective courses cross-checked with offering departments" },
      { id: "5", text: "Students given minimum 1 week to choose electives after orientation" },
      { id: "6", text: "Kochi / Online / ODL / other campus stakeholders included in planning" },
    ],
  },
  {
    title: "Section 2: Faculty Allocation & Workload",
    items: [
      { id: "7", text: "All courses have faculty assigned" },
      { id: "8", text: "Workload is fair and transparent across the department" },
      { id: "9", text: "Faculty informed of their course allocations formally" },
      { id: "10", text: "Faculty workload documented and assessed" },
    ],
  },
  {
    title: "Section 3: TLEP Audit (HOD-level)",
    items: [
      { id: "12", text: "HOD has reviewed / audited all TLEPs" },
      { id: "13", text: "Innovative pedagogies and assessments collated from TLEPs" },
      { id: "14", text: "Previous semester faculty feedback shared with faculty" },
    ],
  },
  {
    title: "Section 4: Timetable & ERP",
    items: [
      { id: "15", text: "Master timetable prepared" },
      { id: "16", text: "Master timetable uploaded on ERP" },
      { id: "17", text: "Course matrix created and approved in Faculty" },
    ],
  },
  {
    title: "Section 5: LMS & Digital Readiness (HOD-level)",
    items: [{ id: "19", text: "All faculty trained on LMS platform" }],
  },
  {
    title: "Section 6: Students & Activities",
    items: [
      { id: "21", text: "Co-curricular and extra-curricular activities planned and calendarised" },
      { id: "22", text: "Student Progression and Graduation report reviewed" },
      { id: "23", text: "Departmental Academic Achievement report prepared" },
    ],
  },
  {
    title: "Section 7: Faculty Development & Research",
    items: [
      { id: "24", text: "Faculty development / capacity building activities planned" },
      { id: "25", text: "Research activities (conferences, seminars) planned and calendarised" },
    ],
  },
  {
    title: "Section 8: Infrastructure & Approvals",
    items: [
      { id: "26", text: "Lab equipment, requirements and budget assessed" },
      { id: "27", text: "All necessary approvals obtained from University HO" },
      { id: "28", text: "Mid Sem Review Date" },
    ],
  },
];

export const FACULTY_SECTIONS: ChecklistSection[] = [
  {
    title: "Section A: TLEP & Course Planning",
    items: [
      { id: "F1", text: "TLEP submitted for the course" },
      { id: "F2", text: "Session plans prepared for entire semester" },
      { id: "F3", text: "Course objectives & outcomes mapped to PO/PSO" },
      { id: "F4", text: "Assessment plan finalized CIE/SEE components" },
    ],
  },
  {
    title: "Section B: ERP & Documentation",
    items: [
      { id: "F5", text: "Session plan uploaded on ERP" },
      { id: "F6", text: "Course material (notes/PPTs) prepared" },
      { id: "F7", text: "Reference textbooks & resources listed" },
    ],
  },
  {
    title: "Section C: LMS & Digital Readiness",
    items: [
      { id: "F8", text: "LMS course is live & accessible to students" },
      { id: "F9", text: "Week-1 content uploaded on LMS" },
      { id: "F10", text: "Discussion forums / assignments configured on LMS" },
    ],
  },
  {
    title: "Section D: Pedagogy & Innovation",
    items: [
      { id: "F11", text: "Innovative pedagogies planned (case studies, flipped classroom, etc.)" },
      { id: "F12", text: "Industry/practical examples integrated in course" },
    ],
  },
];

export type ClosureSection = { id: string; title: string; hint: string };

export const HOD_CLOSURE_SECTIONS: ClosureSection[] = [
  { id: "1", title: "Overview of the Semester", hint: "Brief narrative of how the semester progressed overall." },
  { id: "2", title: "Objectives Planned — Were They Achieved?", hint: "State the key objectives set at the beginning and whether each was met." },
  { id: "3", title: "Adherence to Academic Calendar", hint: "Highlight any deviations from the calendar and corrective actions taken." },
  { id: "4", title: "Course Completion Summary", hint: "Summary of courses offered and completed. Flag any incomplete ones with reasons." },
  { id: "5", title: "Student Performance Overview", hint: "Average grades, top performers, notable academic achievements." },
  { id: "6", title: "Faculty Contributions", hint: "Research published, conferences presented, awards received this semester." },
  { id: "7", title: "Conferences, Workshops, Seminars & Guest Lectures", hint: "List all events conducted with dates and participants." },
  { id: "8", title: "Department Events & Extra-curricular Activities", hint: "Overview of departmental events, fests, competitions etc." },
  { id: "9", title: "Collaborations & Partnerships", hint: "New MoUs or collaborations with Industry / Academia signed this semester." },
  { id: "10", title: "Academic Audits", hint: "Confirm that academic audits were conducted for all courses. Note any findings." },
  { id: "11", title: "CA Components — Entry & Approval", hint: "Confirm CA marks are entered and approved in ERP for all courses." },
  { id: "12", title: "COLAB Files Review", hint: "Status of COLAB file review for this semester." },
  { id: "13", title: "COLAB — Previous Closing, Current Opening & Attainment", hint: "Confirm COLAB linkage: previous closing report reviewed, current opening report ready, CO attainment computed." },
  { id: "14", title: "HOD Additional Observations / Action Items for Next Semester", hint: "Any other noteworthy points or action items to carry forward." },
];

export const FACULTY_CLOSURE_SECTIONS: ChecklistSection[] = [
  {
    title: "Section A: ERP & Records",
    items: [
      { id: "FC1", text: "Attendance Entry in ERP with Analysis Report" },
      { id: "FC2", text: "Continuous Assessment Marks Entry in ERP" },
      { id: "FC3", text: "CA components mapped to COs / Bloom's Level" },
      { id: "FC4", text: "Consolidated CA list available" },
      { id: "FC5", text: "Assignment record maintained" },
    ],
  },
  {
    title: "Section B: Syllabus & Teaching",
    items: [
      { id: "FC6", text: "Compliance to Teaching-Learning-Evaluation Plan (TLEP)" },
      { id: "FC7", text: "Completion of Syllabus" },
      { id: "FC8", text: "Innovative teaching methods adapted" },
    ],
  },
  {
    title: "Section C: Learning Materials",
    items: [
      { id: "FC9", text: "Availability of Lecture Notes / PPTs" },
      { id: "FC10", text: "Sample Lecture Notes / PPT uploaded" },
      { id: "FC11", text: "Experiential Learning record with rubrics for Evaluation" },
      { id: "FC12", text: "Sample Experiential Learning activity with rubrics uploaded" },
    ],
  },
  {
    title: "Section D: Evaluation",
    items: [
      { id: "FC13", text: "Innovative Evaluation Strategy used" },
      { id: "FC14", text: "Availability of CO-PO (and PSO, if applicable) mapping" },
      { id: "FC15", text: "Course End Survey Conducted" },
    ],
  },
  {
    title: "Section E: Student Support",
    items: [
      { id: "FC16", text: "Slow learner / advance learner list prepared" },
      { id: "FC17", text: "Record of remedial classes maintained" },
      { id: "FC18", text: "Record of Extra lectures for Guided Self Study (GSS)" },
      { id: "FC19", text: "Lab Manuals available (wherever lab is a part of CA)" },
      { id: "FC20", text: "Result analysis with backlog list (course-wise)" },
    ],
  },
  {
    title: "Section F: Mentoring & Projects",
    items: [
      { id: "FC21", text: "Mentoring Report prepared" },
      { id: "FC22", text: "TD-PCL Report (batches, students, faculty, project title, progress)" },
      { id: "FC23", text: "Internship Report — Groups" },
    ],
  },
];

export function facultySectionsFor(module: ModuleKey): ChecklistSection[] {
  return module === "closure" ? FACULTY_CLOSURE_SECTIONS : FACULTY_SECTIONS;
}

export const STATUS_OPTIONS = ["Yes", "No", "N/A"] as const;
