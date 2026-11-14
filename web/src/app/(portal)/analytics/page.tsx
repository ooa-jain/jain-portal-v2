import type { Metadata } from "next";
import Link from "next/link";
import { requireDepartmentUser } from "@/lib/auth";
import { getSettings, listAllSubmissions, listMySubmissions } from "@/lib/data";
import { knownCourses, listDocuments, scopeFilter, weeklyUploads } from "@/lib/documents";
import { DEPARTMENTS, DOC_TYPES } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyRow, Notice, PageHeader, Stat } from "@/components/ui/page";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { DeptPicker, SemesterPicker } from "./pickers";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

function Bar({ value, total, tone = "bg-primary" }: { value: number; total: number; tone?: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <span className="flex items-center gap-2.5">
      <span className="h-2 flex-1 rounded-full bg-[#e4e7ec]"><span className={`block h-2 rounded-full ${tone}`} style={{ width: `${pct}%` }} /></span>
      <span className="w-20 text-right text-xs tabular-nums text-[#475467]">{value}/{total} · {pct}%</span>
    </span>
  );
}

export default async function AnalyticsPage({ searchParams }: PageProps<"/analytics">) {
  const user = await requireDepartmentUser();
  const params = await searchParams;
  const settings = await getSettings();
  const semesters = [...settings.enabled_years].sort().reverse().flatMap((y) => settings.enabled_semesters.map((s) => `${s} ${y}`));
  const semesterParam = typeof params.semester === "string" && semesters.includes(params.semester) ? params.semester : "";
  const deptParam = typeof params.dept === "string" && DEPARTMENTS.includes(params.dept) ? params.dept : "";
  const dept = user.isAdmin ? deptParam : user.department;

  if (!user.isAdmin && !dept) {
    return (
      <>
        <PageHeader title="Analytics" />
        <Notice tone="warning" title="Set your department">Choose your department on the Home page to see its analytics.</Notice>
      </>
    );
  }

  const [allDocs, courses, submissions] = await Promise.all([
    listDocuments(scopeFilter(user, dept || undefined)),
    dept ? knownCourses(dept) : Promise.resolve([]),
    user.isAdmin ? listAllSubmissions() : listMySubmissions(user),
  ]);
  // Default to the semester of the most recent upload, else the newest one offered.
  const latestUpload = [...allDocs].sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))[0];
  const semester = semesterParam || (latestUpload && semesters.includes(latestUpload.semester) ? latestUpload.semester : semesters[0] ?? "");
  const docs = allDocs.filter((d) => d.semester === semester);

  const approved = docs.filter((d) => d.review.status === "approved").length;
  const pending = docs.filter((d) => d.review.status === "pending").length;
  const fix = docs.filter((d) => d.review.status === "returned" || d.review.status === "not_sent").length;
  const passed = docs.filter((d) => d.check.status === "passed").length;
  const courseCodes = new Set([...courses.map((c) => c.course_code), ...docs.map((d) => d.course_code)]);
  const totalSlots = courseCodes.size * DOC_TYPES.length;

  const weeks = weeklyUploads(allDocs);
  const maxWeek = Math.max(1, ...weeks.map((w) => w.count));

  const subsForDept = dept ? submissions.filter((s) => s.identity.dept === dept) : submissions;
  const subsSem = subsForDept.filter((s) => s.identity.semester === semester);

  // Admin, all departments: one row per department.
  const deptRows = user.isAdmin && !dept
    ? DEPARTMENTS.map((d) => {
        const own = docs.filter((x) => x.dept === d);
        const subs = subsSem.filter((s) => s.identity.dept === d);
        return {
          dept: d,
          docs: own.length,
          approved: own.filter((x) => x.review.status === "approved").length,
          pending: own.filter((x) => x.review.status === "pending").length,
          courses: new Set(own.map((x) => x.course_code)).size,
          readiness: subs.some((s) => s.form_type === "readiness" && !s._draft),
          closure: subs.some((s) => s.form_type === "closure" && !s._draft),
          last: own.map((x) => x.uploaded_at).sort().pop() ?? "",
        };
      }).sort((a, b) => b.docs - a.docs || a.dept.localeCompare(b.dept))
    : [];

  return (
    <>
      <PageHeader
        title="Analytics"
        suffix={semester}
        description={dept ? dept : "All departments"}
        actions={
          <>
            {user.isAdmin && <DeptPicker value={dept} />}
            <SemesterPicker value={semester} semesters={semesters} />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Documents" value={docs.length} hint={`${courseCodes.size || "No"} course${courseCodes.size === 1 ? "" : "s"}`} />
        <Stat label="Approved" value={approved} tone="success" progress={docs.length ? (approved / docs.length) * 100 : 0} />
        <Stat label="Waiting for HOD" value={pending} tone="warning" />
        <Stat label="Need changes" value={fix} tone={fix ? "danger" : "default"} />
        <Stat label="Passed the automatic check" value={docs.length ? `${Math.round((passed / docs.length) * 100)}%` : "—"} hint="First time, no notes" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Document coverage</CardTitle>
            <CardDescription>
              {dept ? `Courses with each document approved, out of ${courseCodes.size} known course${courseCodes.size === 1 ? "" : "s"}.` : "Approved documents of each type across all departments."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {DOC_TYPES.map((t) => {
              const ok = new Set(docs.filter((d) => d.doc_type === t.key && d.review.status === "approved").map((d) => `${d.dept}|${d.course_code}`)).size;
              const all = dept ? courseCodes.size : new Set(docs.map((d) => `${d.dept}|${d.course_code}`)).size;
              return (
                <div key={t.key} className="grid items-center gap-1.5 sm:grid-cols-[minmax(0,15rem)_1fr]">
                  <span className="truncate text-[13px]" title={t.label}>
                    {t.label}
                    <span className="ml-1.5 text-[11px] uppercase text-muted-foreground">{t.phase === "readiness" ? "R" : "C"}</span>
                  </span>
                  <Bar value={ok} total={all} tone={t.phase === "readiness" ? "bg-primary" : "bg-[#2563eb]"} />
                </div>
              );
            })}
            {totalSlots > 0 && (
              <p className="border-t pt-3 text-[13px] text-[#475467]">
                Overall: <strong className="text-primary">{approved}</strong> of {totalSlots} required documents approved for {semester}.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Uploads, last 8 weeks</CardTitle></CardHeader>
            <CardContent>
              <div className="flex h-36 items-end gap-2" role="img" aria-label={`Weekly uploads: ${weeks.map((w) => `${w.label} ${w.count}`).join(", ")}`}>
                {weeks.map((w) => (
                  <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[11px] tabular-nums text-[#475467]">{w.count || ""}</span>
                    <span className="w-full rounded-t bg-primary" style={{ height: `${Math.max(2, (w.count / maxWeek) * 100)}px`, opacity: w.count ? 1 : 0.15 }} />
                    <span className="text-[10.5px] text-muted-foreground">{w.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Checklist submissions · {semester}</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2.5 text-[13.5px]">
              {(["readiness", "closure"] as const).map((k) => {
                const list = subsSem.filter((s) => s.form_type === k);
                const final = list.filter((s) => !s._draft).length;
                return (
                  <p key={k} className="flex items-center justify-between">
                    <span>{k === "readiness" ? "Semester Readiness" : "Semester Closure"}</span>
                    <span className="font-semibold text-primary">{final} submitted{list.length - final ? ` · ${list.length - final} draft` : ""}</span>
                  </p>
                );
              })}
              <p className="flex items-center justify-between">
                <span>Faculty checklist responses</span>
                <span className="font-semibold text-primary">{subsSem.reduce((n, s) => n + (s.faculty_submission_count ?? 0), 0)}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {deptRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>By department</CardTitle>
            <CardDescription>Choose a department above to see its course-level coverage.</CardDescription>
          </CardHeader>
          <Table>
            <THead>
              <tr><TH>Department</TH><TH className="text-right">Courses</TH><TH className="text-right">Documents</TH><TH>Approved</TH><TH className="text-right">With HOD</TH><TH>Readiness</TH><TH>Closure</TH><TH>Last upload</TH></tr>
            </THead>
            <TBody>
              {deptRows.map((r) => (
                <TR key={r.dept}>
                  <TD><Link href={`/analytics?dept=${encodeURIComponent(r.dept)}&semester=${encodeURIComponent(semester)}`} className="font-medium text-primary hover:underline">{r.dept}</Link></TD>
                  <TD className="text-right tabular-nums">{r.courses}</TD>
                  <TD className="text-right tabular-nums">{r.docs}</TD>
                  <TD className="min-w-48"><Bar value={r.approved} total={r.docs} tone="bg-success" /></TD>
                  <TD className="text-right tabular-nums">{r.pending}</TD>
                  <TD>{r.readiness ? "Submitted" : <span className="text-muted-foreground">—</span>}</TD>
                  <TD>{r.closure ? "Submitted" : <span className="text-muted-foreground">—</span>}</TD>
                  <TD className="whitespace-nowrap text-xs text-muted-foreground">{r.last ? formatDate(r.last) : "—"}</TD>
                </TR>
              ))}
              {deptRows.length === 0 && <EmptyRow colSpan={8}>No data.</EmptyRow>}
            </TBody>
          </Table>
        </Card>
      )}
    </>
  );
}
