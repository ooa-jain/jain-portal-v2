import type { Metadata } from "next";
import Link from "next/link";
import { requireDepartmentUser } from "@/lib/auth";
import { listFacultyForOwner } from "@/lib/data";
import { MODULES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyRow, PageHeader, Stat } from "@/components/ui/page";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Faculty Responses" };

export default async function AnalysisPage() {
  const user = await requireDepartmentUser();
  const rows = (await listFacultyForOwner(user.email)).sort((a, b) => b.faculty.timestamp.localeCompare(a.faculty.timestamp));

  const pending = rows.filter((r) => r.faculty.hod_review_status === "pending").length;
  const facultyCount = new Set(rows.map((r) => r.faculty.faculty_email)).size;
  const noCount = rows.reduce((n, r) => n + Object.values(r.faculty.checklist).filter((a) => a.status === "No").length, 0);

  return (
    <>
      <PageHeader title="Faculty Responses" description="Every faculty checklist received through the share links on your submissions." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Responses" value={rows.length} />
        <Stat label="Faculty members" value={facultyCount} />
        <Stat label="Awaiting review" value={pending} tone={pending ? "warning" : "success"} />
        <Stat label="Items marked No" value={noCount} tone={noCount ? "danger" : "success"} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All responses</CardTitle>
          <CardDescription>Open the submission to read a checklist and record your review.</CardDescription>
        </CardHeader>
        <Table>
          <THead>
            <tr><TH>Faculty</TH><TH>Course</TH><TH>Program</TH><TH>Module</TH><TH>Semester</TH><TH className="text-right">Yes</TH><TH className="text-right">No</TH><TH>Review</TH><TH>Received</TH></tr>
          </THead>
          <TBody>
            {rows.map(({ faculty, parent }) => {
              const answers = Object.values(faculty.checklist);
              const no = answers.filter((a) => a.status === "No").length;
              return (
                <TR key={faculty._id}>
                  <TD>
                    <Link href={`/${parent.form_type}/form/${parent._id}?step=3`} className="font-semibold text-primary hover:underline">{faculty.faculty_name}</Link>
                    <span className="block text-xs text-muted-foreground">{faculty.faculty_email}</span>
                  </TD>
                  <TD>{faculty.course_name}<span className="block text-xs text-muted-foreground">{faculty.course_code}</span></TD>
                  <TD>{faculty.program || "—"}</TD>
                  <TD>{MODULES[faculty.form_type].short}</TD>
                  <TD className="whitespace-nowrap">{parent.identity.semester || "—"}</TD>
                  <TD className="text-right tabular-nums">{answers.filter((a) => a.status === "Yes").length}</TD>
                  <TD className={`text-right tabular-nums ${no ? "font-semibold text-destructive" : ""}`}>{no}</TD>
                  <TD>
                    <Badge variant={faculty.hod_review_status === "pending" ? "warning" : faculty.hod_review_status === "needs_changes" ? "destructive" : "success"}>
                      {faculty.hod_review_status === "pending" ? "Awaiting review" : faculty.hod_review_status === "needs_changes" ? "Needs changes" : "Reviewed"}
                    </Badge>
                  </TD>
                  <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(faculty.timestamp)}</TD>
                </TR>
              );
            })}
            {rows.length === 0 && <EmptyRow colSpan={9}>No faculty responses yet. Share the faculty link from a readiness or closure submission.</EmptyRow>}
          </TBody>
        </Table>
      </Card>
    </>
  );
}
