import "server-only";
import ExcelJS from "exceljs";
import {
  FACULTY_CLOSURE_SECTIONS,
  FACULTY_SECTIONS,
  HOD_CLOSURE_SECTIONS,
  HOD_SECTIONS,
  IEA_SECTIONS,
  IEA_YEARS,
  MID_SEM_ITEM_ID,
  facultySectionsFor,
  type FormModuleKey,
} from "./constants";
import type { FacultySubmission, IeaSubmission, Submission } from "./types";
import { str } from "./utils";

const NAVY = "FF0A2558";
const GOLD = "FFF4A819";
const RED_TINT = "FFFFE8E8";
const GREEN_TINT = "FFE8F8EE";

const thin = { style: "thin" as const };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };

function fill(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function titleRow(ws: ExcelJS.Worksheet, text: string, columns: number) {
  ws.mergeCells(1, 1, 1, columns);
  const cell = ws.getCell(1, 1);
  cell.value = text;
  cell.font = { name: "Calibri", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  cell.fill = fill(NAVY);
  cell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 30;
}

function headerRow(ws: ExcelJS.Worksheet, rowNumber: number, headers: string[]) {
  const row = ws.getRow(rowNumber);
  headers.forEach((header, index) => {
    const cell = row.getCell(index + 1);
    cell.value = header;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = fill(NAVY);
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = BORDER;
  });
  row.height = 32;
}

function dataRow(
  ws: ExcelJS.Worksheet,
  rowNumber: number,
  values: (string | number)[],
  tint?: string,
) {
  const row = ws.getRow(rowNumber);
  values.forEach((value, index) => {
    const cell = row.getCell(index + 1);
    cell.value = value;
    cell.font = { name: "Calibri", size: 10 };
    cell.alignment = { vertical: "top", wrapText: true };
    cell.border = BORDER;
    if (tint) cell.fill = fill(tint);
  });
}

function labelRow(ws: ExcelJS.Worksheet, rowNumber: number, label: string, value: string, span: number) {
  const row = ws.getRow(rowNumber);
  const labelCell = row.getCell(1);
  labelCell.value = label;
  labelCell.font = { name: "Calibri", size: 10, bold: true };
  labelCell.fill = fill(GOLD);
  labelCell.border = BORDER;
  const valueCell = row.getCell(2);
  valueCell.value = value;
  valueCell.font = { name: "Calibri", size: 10 };
  valueCell.border = BORDER;
  ws.mergeCells(rowNumber, 2, rowNumber, span);
}

function widths(ws: ExcelJS.Worksheet, sizes: number[]) {
  sizes.forEach((width, index) => {
    ws.getColumn(index + 1).width = width;
  });
}

function statusTint(status: string): string | undefined {
  if (status === "No") return RED_TINT;
  if (status === "Yes") return GREEN_TINT;
  return undefined;
}

function moduleLabel(module: FormModuleKey) {
  return module === "closure" ? "Closure" : "Readiness";
}

export type SubmissionWithFaculty = Submission & { faculty: FacultySubmission[] };

/** Consolidated workbook: one or many submissions, with their faculty checklists. */
export async function buildWorkbook(submissions: SubmissionWithFaculty[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Jain OOA Portal — Office of Academic Affairs";

  // 1. Dashboard
  const dash = wb.addWorksheet("Dashboard");
  const dashHeads = [
    "Timestamp", "Form Type", "Status", "Campus", "Department", "HOD Name", "HOD Email", "Semester",
    "Acad Year", "Sub Date", "Faculty Deadline", "Mid Sem Date", "Faculty Submissions", "HOD Checklist Yes/Total",
  ];
  titleRow(dash, "JAIN University — Semester Submissions Dashboard", dashHeads.length);
  headerRow(dash, 2, dashHeads);
  submissions.forEach((s, index) => {
    const answers = Object.entries(s.hodChecklist).filter(([id]) => id !== MID_SEM_ITEM_ID);
    const yes = answers.filter(([, a]) => a.status === "Yes").length;
    dataRow(dash, index + 3, [
      s.timestamp, s.form_type, s._draft ? "Draft" : "Submitted", s.identity.campus, s.identity.dept,
      s.identity.hodName, s.identity.hodEmail, s.identity.semester, s.identity.acYear, s.identity.subDate,
      s.identity.hodDeadline, s.hodChecklist[MID_SEM_ITEM_ID]?.status ?? "", s.faculty.length,
      s.form_type === "readiness" ? `${yes}/${answers.length}` : "—",
    ]);
  });
  widths(dash, [22, 12, 12, 12, 34, 22, 28, 16, 12, 14, 16, 14, 12, 14]);

  // 2. Faculty submissions
  const fac = wb.addWorksheet("Faculty Submissions");
  const facHeads = [
    "Form Type", "Department", "Campus", "Semester", "Faculty Name", "Faculty Email", "Course", "Code",
    "Program", "Year/Sem", "Students", "HOD Remarks", "Review Status",
  ];
  titleRow(fac, "Faculty Submissions (via Shared Link)", facHeads.length);
  headerRow(fac, 2, facHeads);
  let r = 3;
  for (const s of submissions) {
    for (const f of s.faculty) {
      dataRow(fac, r++, [
        f.form_type, f.dept, f.campus, f.semester, f.faculty_name, f.faculty_email, f.course_name,
        f.course_code, f.program, f.year_sem, f.no_of_students, f.hod_remarks, f.hod_review_status,
      ]);
    }
  }
  widths(fac, [12, 30, 12, 16, 22, 28, 26, 12, 18, 12, 10, 30, 14]);

  // 3. Faculty checklist, item by item
  const detail = wb.addWorksheet("Faculty Checklist Detail");
  const detailHeads = ["Form Type", "Department", "Faculty Name", "Course", "Code", "Item #", "Checklist Item", "Status", "Remark"];
  titleRow(detail, "Faculty Checklist — Item-wise", detailHeads.length);
  headerRow(detail, 2, detailHeads);
  r = 3;
  for (const s of submissions) {
    for (const f of s.faculty) {
      for (const section of facultySectionsFor(f.form_type)) {
        for (const item of section.items) {
          const answer = f.checklist[item.id] ?? { status: "", remark: "" };
          dataRow(
            detail, r++,
            [f.form_type, f.dept, f.faculty_name, f.course_name, f.course_code, item.id, item.text, answer.status, answer.remark],
            statusTint(answer.status),
          );
        }
      }
    }
  }
  widths(detail, [12, 30, 22, 26, 12, 8, 50, 10, 32]);

  // 4. HOD readiness checklist
  const hod = wb.addWorksheet("HOD Checklist");
  const hodHeads = ["Department", "Campus", "Semester", "Item #", "Checklist Item", "Section", "Status", "Remark"];
  titleRow(hod, "HOD Readiness Checklist — All Departments", hodHeads.length);
  headerRow(hod, 2, hodHeads);
  r = 3;
  for (const s of submissions.filter((x) => x.form_type === "readiness")) {
    for (const section of HOD_SECTIONS) {
      for (const item of section.items) {
        const answer = s.hodChecklist[item.id] ?? { status: "", remark: "" };
        dataRow(
          hod, r++,
          [s.identity.dept, s.identity.campus, s.identity.semester, item.id, item.text,
            section.title.split(": ").slice(1).join(": ") || section.title, answer.status, answer.remark],
          statusTint(answer.status),
        );
      }
    }
  }
  widths(hod, [30, 12, 14, 8, 54, 28, 12, 32]);

  // 5. HOD closure reports
  const closure = wb.addWorksheet("HOD Closure Reports");
  const closureHeads = ["Department", "Campus", "Semester", "Vertical", "HOD Narrative", "Link", "File"];
  titleRow(closure, "HOD Semester Closure — Narrative Reports", closureHeads.length);
  headerRow(closure, 2, closureHeads);
  r = 3;
  for (const s of submissions.filter((x) => x.form_type === "closure")) {
    for (const section of HOD_CLOSURE_SECTIONS) {
      const answer = s.hodReport[section.id];
      dataRow(closure, r++, [
        s.identity.dept, s.identity.campus, s.identity.semester, `${section.id}. ${section.title}`,
        answer?.text ?? "", answer?.link ?? "", answer?.file_url ?? "",
      ]);
    }
  }
  widths(closure, [30, 12, 14, 40, 80, 30, 30]);

  // 6. Gap analysis (readiness)
  const gap = wb.addWorksheet("Gap Analysis");
  const gapHeads = ["Department", "Campus", "Semester", "Yes", "No", "N/A", "Blank", "Completion %", "Gap Items (No)"];
  titleRow(gap, "Gap Analysis — Readiness Checklist Completion by Department", gapHeads.length);
  headerRow(gap, 2, gapHeads);
  const scored = HOD_SECTIONS.flatMap((s) => s.items).filter((i) => i.id !== MID_SEM_ITEM_ID);
  r = 3;
  for (const s of submissions.filter((x) => x.form_type === "readiness")) {
    const status = (id: string) => s.hodChecklist[id]?.status ?? "";
    const yes = scored.filter((i) => status(i.id) === "Yes").length;
    const no = scored.filter((i) => status(i.id) === "No").length;
    const na = scored.filter((i) => status(i.id) === "N/A").length;
    const blank = scored.length - yes - no - na;
    const denominator = yes + no + blank;
    const gaps = scored.filter((i) => status(i.id) === "No").map((i) => `${i.id}. ${i.text}`).join("; ");
    dataRow(gap, r, [
      s.identity.dept, s.identity.campus, s.identity.semester, yes, no, na, blank,
      denominator ? `${Math.round((yes / denominator) * 100)}%` : "—", gaps,
    ]);
    if (no > 0) {
      const cell = gap.getRow(r).getCell(5);
      cell.fill = fill(RED_TINT);
      cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFAA0000" } };
    }
    r++;
  }
  widths(gap, [30, 12, 14, 8, 8, 8, 8, 14, 70]);

  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** The HOD's own filled form, plus a blank faculty checklist for reference. */
export async function buildHodChecklistWorkbook(sub: Submission): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const label = moduleLabel(sub.form_type);
  const ws = wb.addWorksheet(`HOD ${label}`);
  titleRow(ws, `JAIN University — HOD Semester ${label} Submission`, 5);

  const identityRows: [string, string][] = [
    ["Department", sub.identity.dept],
    ["Campus", sub.identity.campus],
    ["HOD Name", sub.identity.hodName],
    ["HOD Email", sub.identity.hodEmail],
    ["Semester", sub.identity.semester],
    ["Academic Year", sub.identity.acYear],
    ["Submission Date", sub.identity.subDate],
    ["Faculty Deadline", sub.identity.hodDeadline],
  ];
  if (sub.form_type === "readiness") {
    identityRows.push(["Mid Sem Review Date", sub.hodChecklist[MID_SEM_ITEM_ID]?.status ?? ""]);
  }
  let r = 3;
  for (const [key, value] of identityRows) labelRow(ws, r++, key, value, 5);
  r++;

  if (sub.form_type === "closure") {
    headerRow(ws, r++, ["#", "Vertical (HOD Report Section)", "HOD Narrative", "Link", "File"]);
    for (const section of HOD_CLOSURE_SECTIONS) {
      const answer = sub.hodReport[section.id];
      dataRow(ws, r++, [section.id, section.title, answer?.text ?? "", answer?.link ?? "", answer?.file_url ?? ""]);
    }
    widths(ws, [8, 34, 70, 28, 28]);
  } else {
    headerRow(ws, r++, ["#", "Section", "Checklist Item", "Status", "Remark / Notes"]);
    for (const section of HOD_SECTIONS) {
      for (const item of section.items) {
        const answer = sub.hodChecklist[item.id] ?? { status: "", remark: "" };
        dataRow(ws, r, [item.id, section.title, item.text, answer.status, answer.remark]);
        const tint = statusTint(answer.status);
        if (tint) ws.getRow(r).getCell(4).fill = fill(tint);
        r++;
      }
    }
    widths(ws, [8, 32, 55, 14, 38]);
  }

  const template = wb.addWorksheet("Faculty Checklist (Template)");
  titleRow(template, `Faculty Semester ${label} Checklist`, 4);
  const facultyRows: [string, string][] = [
    ["Department", sub.identity.dept],
    ["Campus", sub.identity.campus],
    ["HOD Name", sub.identity.hodName],
    ["Semester", sub.identity.semester],
    ["Academic Year", sub.identity.acYear],
    ["Faculty Name", ""],
    ["Faculty Email", ""],
    ["Course Name", ""],
    ["Course Code", ""],
  ];
  r = 3;
  for (const [key, value] of facultyRows) labelRow(template, r++, key, value, 4);
  r++;
  headerRow(template, r++, ["#", "Faculty Checklist Item", "Status (Yes/No/N/A)", "Remarks / Evidence Link"]);
  const sections = sub.form_type === "closure" ? FACULTY_CLOSURE_SECTIONS : FACULTY_SECTIONS;
  for (const section of sections) {
    template.mergeCells(r, 1, r, 4);
    const cell = template.getCell(r, 1);
    cell.value = section.title;
    cell.font = { name: "Calibri", size: 10, bold: true };
    cell.fill = fill(GOLD);
    cell.border = BORDER;
    r++;
    for (const item of section.items) dataRow(template, r++, [item.id, item.text, "", ""]);
  }
  widths(template, [10, 60, 20, 38]);

  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** IEA report: one sheet per academic year, sections A–F stacked inside each sheet. */
export async function buildIeaWorkbook(docs: IeaSubmission[], year?: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Jain OOA Portal — Office of Academic Affairs";
  const maxCols = Math.max(...IEA_SECTIONS.map((s) => 4 + s.fields.length + 3));

  for (const y of year ? [year] : IEA_YEARS) {
    const ws = wb.addWorksheet(y.replace(/\//g, "-").slice(0, 31));
    titleRow(ws, `JAIN University — Innovation & Emerging Areas — ${y}`, maxCols);
    let r = 3;
    let total = 0;

    for (const section of IEA_SECTIONS) {
      const rows = docs.flatMap((d) => (d.years[y]?.[section.key] ?? []).map((entry) => ({ d, entry })));
      total += rows.length;

      ws.mergeCells(r, 1, r, maxCols);
      const band = ws.getCell(r, 1);
      band.value = `Section ${section.key} — ${section.title}  (${rows.length} ${rows.length === 1 ? "entry" : "entries"})`;
      band.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      band.fill = fill(`FF${section.color.replace("#", "").toUpperCase()}`);
      band.alignment = { horizontal: "left", vertical: "middle" };
      ws.getRow(r).height = 22;
      r++;

      headerRow(ws, r++, [
        "School", "Department", "Programme Level", "Academic Year", "Submitted By",
        ...section.fields.map((f) => f.l),
        "Evidence Types", "Evidence Links / Files", "Evidence Notes",
      ]);

      if (rows.length === 0) {
        const cell = ws.getCell(r, 1);
        cell.value = "No entries submitted for this section.";
        cell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF94A3B8" } };
        r += 2;
        continue;
      }
      for (const { d, entry } of rows) {
        const details = Object.values(entry.evidenceDetails);
        const links = [entry.evidenceLink, ...details.flatMap((x) => [x.driveLink, x.fileUrl])].filter(Boolean);
        const notes = [entry.evidenceMissing, ...details.map((x) => x.notes)].filter(Boolean);
        dataRow(ws, r++, [
          d.school, d.department, d.level, y, d.submitterName || d.submitterEmail,
          ...section.fields.map((f) => str(entry[f.k])),
          entry.evidenceTypes.join("; "), [...new Set(links)].join("\n"), [...new Set(notes)].join("\n"),
        ]);
      }
      r++;
    }

    if (total === 0) {
      const note = ws.getCell(2, 1);
      note.value = "No submissions recorded for this academic year.";
      note.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF94A3B8" } };
    }
    widths(ws, [26, 32, 16, 14, 22, ...Array(maxCols - 8).fill(30), 26, 34, 30]);
    ws.views = [{ state: "frozen", ySplit: 1 }];
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function xlsxResponse(buffer: Buffer, filename: string): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.\-]+/g, "_")}"`,
      "Cache-Control": "no-store",
    },
  });
}
