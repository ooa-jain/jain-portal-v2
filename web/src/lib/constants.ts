/**
 * Form definitions. Item ids and wording are the same as the old portal so
 * existing submissions in the database line up with these checklists.
 */

export type ModuleKey = "readiness" | "closure" | "iea";
/** The two modules that share the HOD-submission + faculty-checklist flow. */
export type FormModuleKey = "readiness" | "closure";

export type ModuleMeta = {
  key: ModuleKey;
  label: string;
  short: string;
  href: string;
  description: string;
  enabledKey: "readiness_enabled" | "closure_enabled" | "iea_enabled";
  deadlineKey: "readiness_deadline" | "closure_deadline" | "iea_deadline";
  permissionField: "can_readiness" | "can_closure" | "can_iea";
  overrideField: "readiness_access_override" | "closure_access_override" | "iea_access_override";
};

export const MODULES: Record<ModuleKey, ModuleMeta> = {
  readiness: {
    key: "readiness",
    label: "Semester Readiness",
    short: "Readiness",
    href: "/readiness",
    description: "Pre-semester readiness: curriculum, faculty allocation, timetable, LMS and approvals.",
    enabledKey: "readiness_enabled",
    deadlineKey: "readiness_deadline",
    permissionField: "can_readiness",
    overrideField: "readiness_access_override",
  },
  closure: {
    key: "closure",
    label: "Semester Closure",
    short: "Closure",
    href: "/closure",
    description: "End-of-semester report: course completion, student performance, events, audits and action items.",
    enabledKey: "closure_enabled",
    deadlineKey: "closure_deadline",
    permissionField: "can_closure",
    overrideField: "closure_access_override",
  },
  iea: {
    key: "iea",
    label: "Innovation & Emerging Areas",
    short: "IEA",
    href: "/iea",
    description: "Programmes and courses in innovation and emerging areas, AY 2022-23 to AY 2026-27 (UGC data collection).",
    enabledKey: "iea_enabled",
    deadlineKey: "iea_deadline",
    permissionField: "can_iea",
    overrideField: "iea_access_override",
  },
};

export const MODULE_KEYS: ModuleKey[] = ["readiness", "closure", "iea"];
export const FORM_MODULE_KEYS: FormModuleKey[] = ["readiness", "closure"];

export function isModuleKey(value: unknown): value is ModuleKey {
  return value === "readiness" || value === "closure" || value === "iea";
}
export function isFormModuleKey(value: unknown): value is FormModuleKey {
  return value === "readiness" || value === "closure";
}

/** Map a stored access-request label (e.g. "Semester Readiness") back to its module. */
export function moduleFromLabel(label: string): ModuleMeta | null {
  const text = label.trim().toLowerCase();
  if (!text) return null;
  for (const key of MODULE_KEYS) if (text === MODULES[key].label.toLowerCase()) return MODULES[key];
  if (text.includes("readiness")) return MODULES.readiness;
  if (text.includes("closure")) return MODULES.closure;
  if (["iea", "innovation", "emerging"].some((alias) => text.includes(alias))) return MODULES.iea;
  return null;
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

export function facultySectionsFor(module: FormModuleKey): ChecklistSection[] {
  return module === "closure" ? FACULTY_CLOSURE_SECTIONS : FACULTY_SECTIONS;
}

export const STATUS_OPTIONS = ["Yes", "No", "N/A"] as const;

// ── Innovation & Emerging Areas (IEA) ───────────────────────────────

export const IEA_SCHOOLS: Record<string, Record<string, string[]>> = {
  "School of Sciences": {
    "Department of Chemistry & Biochemistry": ["UG", "PG"],
    "Department of Computer Science & IT": ["UG", "PG"],
    "Department of Data Analytics & Mathematical Sciences": ["UG", "PG"],
    "Department of Forensic Science": ["UG", "PG"],
    "Department of Microbiology & Botany": ["UG", "PG"],
    "Department of Physics & Electronics": ["UG", "PG"],
    "Department of Psychology & Allied Science": ["UG", "PG"],
    "Department of Biotechnology and Genetics": ["UG", "PG"],
  },
  "School of Commerce": {
    "Department of Commerce": ["UG", "PG", "Doctoral"],
  },
  "School of Computer Science & Information Technology": {
    "Department of Animation & Virtual Reality": ["UG", "PG"],
    "Department of Computer Science & Information Technology": ["UG", "PG"],
  },
  "School of Engineering & Technology": {
    "Department of Civil Engineering": ["UG", "PG"],
    "Department of Computer Science & Engineering": ["UG", "PG"],
    "Department of Electrical & Electronics Engineering": ["UG", "PG"],
    "Department of Electronics & Communication Engineering": ["UG", "PG"],
    "Department of Food Technology": ["UG", "PG"],
    "Department of Information Science & Engineering": ["UG", "PG"],
    "Department of Mechanical Engineering": ["UG", "PG"],
  },
  "School of Humanities & Social Sciences": {
    "Department of Economics": ["UG", "PG"],
    "Department of Journalism & Mass Communication": ["UG", "PG"],
    "Department of Languages": ["UG", "PG"],
    "Department of Psychology & Allied Science": ["UG", "PG"],
    "Department of CERSSE": ["UG", "PG", "Doctoral"],
    "Department of Humanities & Social Sciences": ["UG", "PG", "Doctoral"],
    "Department of Performing Arts & Cultural Studies": ["UG", "PG"],
  },
  "School of Design, Media & Creative Arts": {
    "Department of Art & Design": ["UG", "PG"],
    "Department of Design": ["UG", "PG"],
    "Department of Performing Arts & Cultural Studies": ["UG", "PG"],
  },
  "School of Law": {
    "Department of Law": ["Integrated UG", "UG", "PG"],
  },
  "School of Allied Healthcare & Sciences": {
    "Department of Allied Healthcare & Sciences": ["UG", "PG"],
  },
  "Center for Management Studies (CMS)": {
    "Department of Management Studies": ["UG", "PG"],
  },
  "CMS Business School": {
    "Department of Management": ["UG", "PG"],
  },
  "School of Aerospace Engineering": {
    "Department of Aerospace Engineering": ["UG", "PG"],
  },
  "School for Aviation & Aerospace Management": {
    "Department of Aviation & Aerospace Management": ["UG", "PG", "Executive Programme", "Executive Postgraduate"],
  },
  "School of Sports Science & Research": {
    "Department of Physical Education & Sports": ["UG", "PG"],
    "Department of Sports Science": ["UG", "PG"],
  },
};

export function isValidIeaUnit(school: string, department: string, level: string): boolean {
  return Boolean(IEA_SCHOOLS[school]?.[department]?.includes(level));
}

export const IEA_YEARS = ["AY 2022-23", "AY 2023-24", "AY 2024-25", "AY 2025-26", "AY 2026-27"];

export const IEA_EVIDENCE_TYPES = [
  "Academic Council Approval",
  "Curriculum & Syllabus",
  "Programme Brochure",
  "Industry MoUs",
  "Professional Body Recognition",
  "Assessment Rubrics",
  "Student Project Reports",
  "Relevant Web Links",
  "Google Drive link (shared with access to Office of Academics)",
];

export type IeaField = { k: string; l: string; t: "text" | "textarea"; ph?: string };
export type IeaSection = { key: string; color: string; title: string; sub: string; fields: IeaField[] };

export const IEA_SECTIONS: IeaSection[] = [
  {
    key: "A", color: "#C9A227", title: "New Programmes Introduced",
    sub: "For each new programme introduced in this academic year",
    fields: [
      { k: "name", l: "New programme introduced (in innovative and emerging areas)", t: "text" },
      { k: "area", l: "Innovation / Emerging area addressed", t: "text", ph: "e.g., AI, Data Science, Cyber Security, FinTech, Sustainability, Industry 4.0/5.0" },
      { k: "newCourses", l: "New courses introduced", t: "textarea" },
      { k: "uniqueFeatures", l: "Unique programme features", t: "textarea" },
      { k: "collaborations", l: "Industry / Academic collaborations", t: "textarea" },
    ],
  },
  {
    key: "B", color: "#2F6F4E", title: "Innovations in Existing Programmes & Courses",
    sub: "Significant innovations, course-level enhancements, and curriculum enhancements",
    fields: [
      { k: "programme", l: "Programme Name", t: "text", ph: "e.g., B.Tech CSE / M.Sc Data Science" },
      { k: "courseCode", l: "Course Code", t: "text", ph: "e.g., 22CSE301 / MAT102" },
      { k: "courseName", l: "Course Name", t: "text", ph: "e.g., Advanced AI & Machine Learning" },
      { k: "curriculumRevisions", l: "Curriculum revisions", t: "textarea" },
      { k: "newElectives", l: "New electives / minors / majors / specialisations", t: "textarea" },
      { k: "interdisciplinary", l: "Interdisciplinary pathways", t: "textarea" },
      { k: "experiential", l: "Experiential learning", t: "textarea" },
    ],
  },
  {
    key: "C", color: "#2C5F8A", title: "Recognition by Global Professional Bodies",
    sub: "Accreditations, benchmarking, and their impact",
    fields: [
      { k: "programme", l: "Programme Name", t: "text" },
      { k: "accreditations", l: "Accreditations", t: "textarea" },
      { k: "recognitions", l: "Recognitions", t: "textarea" },
      { k: "certifications", l: "Certifications", t: "textarea" },
      { k: "curriculumMapping", l: "Curriculum mapping", t: "textarea" },
      { k: "benchmarking", l: "International benchmarking", t: "textarea" },
      { k: "impact", l: "Impact on student outcomes", t: "textarea" },
    ],
  },
  {
    key: "D", color: "#A85C2C", title: "Industry-Integrated Skilling",
    sub: "Industry-linked courses, certifications, and work-integrated learning",
    fields: [
      { k: "programme", l: "Programme Name", t: "text" },
      { k: "industryIntegrated", l: "Industry-integrated courses", t: "textarea" },
      { k: "embeddedCerts", l: "Embedded certifications", t: "textarea" },
      { k: "internships", l: "Internships / Apprenticeships", t: "textarea" },
      { k: "skillModules", l: "Skill-based modules", t: "textarea" },
      { k: "jointDelivery", l: "Joint delivery with industry", t: "textarea" },
      { k: "industryAssessment", l: "Industry assessment", t: "textarea" },
    ],
  },
  {
    key: "E", color: "#6B4A8A", title: "Competency-Based Learning",
    sub: "OBE, competency design, capstones, and assessment reform",
    fields: [
      { k: "programme", l: "Programme Name", t: "text" },
      { k: "obe", l: "OBE implementation", t: "textarea" },
      { k: "competencyCurriculum", l: "Competency-based curriculum", t: "textarea" },
      { k: "capstone", l: "Capstone / Innovation projects", t: "textarea" },
      { k: "fieldImmersion", l: "Field immersion / Clinical training", t: "textarea" },
      { k: "assessmentReforms", l: "Assessment reforms", t: "textarea" },
    ],
  },
  {
    key: "F", color: "#E11D48", title: "Any Other Dimensions",
    sub: "Any other dimensions the School may deem fit to highlight in support of Innovation and Emerging Areas",
    fields: [
      { k: "dimensionTitle", l: "Dimension / Highlight", t: "text", ph: "e.g., Patents & IPR, Student startups, Faculty innovation, MoUs, Awards & Recognitions" },
      { k: "dimensionDetails", l: "Details & contribution to Innovation and Emerging Areas", t: "textarea", ph: "Describe this dimension and how it supports Innovation and Emerging Areas" },
    ],
  },
];

export const IEA_DEFINITION =
  "Programmes and Courses in Innovation and Emerging Areas are academic offerings that address new, evolving, or rapidly advancing domains of knowledge, skills, technologies, professions, and societal needs. Such offerings are characterized by their relevance to contemporary and future developments, interdisciplinary and multidisciplinary approaches, integration of research and innovation, responsiveness to industry and societal requirements, and alignment with global trends and national priorities. They may encompass emerging fields, transformative technologies, novel applications of existing disciplines, and innovative pedagogical approaches that prepare learners for future opportunities, challenges, and lifelong learning.";

/** A finalised HOD submission may be edited this many times before admin approval is needed. */
export const FREE_EDIT_LIMIT = 2;

// ── Document library ────────────────────────────────────────────────

export type DocPhase = "readiness" | "closure";

export type DocType = {
  key: string;
  label: string;
  phase: DocPhase;
  /** Every group must have at least one word found in the document's text. */
  expect: { label: string; any: string[] }[];
  /** Faculty checklist items this document answers, ticked automatically once it is on file. */
  answers: string[];
};

/**
 * The documents each course needs every semester. One current copy per
 * department, course, semester and type: the single source of truth.
 */
export const DOC_TYPES: DocType[] = [
  {
    key: "tlep", label: "TLEP (Teaching-Learning-Evaluation Plan)", phase: "readiness",
    expect: [
      { label: "course outcomes", any: ["course outcome", "co1", "co 1", "co-1", "learning outcome"] },
      { label: "assessment / evaluation plan", any: ["assessment", "evaluation", "cie", "see", "internal"] },
      { label: "teaching schedule", any: ["week", "session", "lecture", "hour", "module", "unit"] },
    ],
    answers: ["F1"],
  },
  {
    key: "session_plan", label: "Session plan", phase: "readiness",
    expect: [
      { label: "session / lecture schedule", any: ["session", "lecture", "class", "week"] },
      { label: "topics", any: ["topic", "unit", "module", "chapter"] },
    ],
    answers: ["F2", "F5"],
  },
  {
    key: "co_po", label: "CO-PO mapping", phase: "readiness",
    expect: [
      { label: "course outcomes (CO)", any: ["co1", "co 1", "course outcome", "co-1"] },
      { label: "programme outcomes (PO/PSO)", any: ["po1", "po 1", "programme outcome", "program outcome", "pso"] },
    ],
    answers: ["F3", "FC14"],
  },
  {
    key: "assessment_plan", label: "Assessment plan (CIE / SEE)", phase: "readiness",
    expect: [{ label: "assessment components", any: ["cie", "see", "assessment", "internal", "marks", "test"] }],
    answers: ["F4"],
  },
  {
    key: "course_material", label: "Course material (notes / PPTs)", phase: "readiness",
    expect: [],
    answers: ["F6", "FC9", "FC10"],
  },
  {
    key: "attendance_report", label: "Attendance analysis report", phase: "closure",
    expect: [{ label: "attendance", any: ["attendance", "present", "absent", "%"] }],
    answers: ["FC1"],
  },
  {
    key: "ca_marks", label: "Consolidated CA marks list", phase: "closure",
    expect: [{ label: "marks", any: ["marks", "ca", "internal", "total", "score"] }],
    answers: ["FC2", "FC4"],
  },
  {
    key: "experiential", label: "Experiential learning record with rubrics", phase: "closure",
    expect: [{ label: "rubric / evaluation criteria", any: ["rubric", "criteria", "evaluation", "score"] }],
    answers: ["FC11", "FC12"],
  },
  {
    key: "course_end_survey", label: "Course end survey", phase: "closure",
    expect: [{ label: "survey / feedback", any: ["survey", "feedback", "response", "rating"] }],
    answers: ["FC15"],
  },
  {
    key: "result_analysis", label: "Result analysis with backlog list", phase: "closure",
    expect: [{ label: "results", any: ["result", "pass", "fail", "grade", "backlog"] }],
    answers: ["FC20"],
  },
  {
    key: "mentoring_report", label: "Mentoring report", phase: "closure",
    expect: [{ label: "mentoring", any: ["mentor", "mentee", "counsel"] }],
    answers: ["FC21"],
  },
];

export function docType(key: string): DocType | undefined {
  return DOC_TYPES.find((t) => t.key === key);
}

export const DOC_EXTENSIONS = [".pdf", ".docx", ".pptx", ".xlsx", ".png", ".jpg", ".jpeg"];
export const DOC_MAX_BYTES = 20 * 1024 * 1024;
