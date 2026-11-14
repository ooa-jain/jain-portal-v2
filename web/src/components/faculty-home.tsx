import Link from "next/link";
import { ArrowRight, FolderOpen } from "lucide-react";
import type { CurrentUser } from "@/lib/auth";
import { collections } from "@/lib/db";
import { normalizeSubmission } from "@/lib/data";
import { listDocuments } from "@/lib/documents";
import { MODULES, docType } from "@/lib/constants";
import { ChangePasswordForm } from "@/components/change-password-form";
import { CheckBadge, ReviewBadge } from "@/components/document-library";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyRow, Notice, PageHeader, Stat } from "@/components/ui/page";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

/** Home for faculty accounts: their documents, what needs fixing, and their checklist links. */
export async function FacultyHome({ user }: { user: CurrentUser }) {
  const [docs, subDocs] = await Promise.all([
    listDocuments({ uploaded_by_email: user.email }),
    user.department
      ? collections.submissions().find({ "identity.dept": user.department, share_token: { $exists: true, $ne: "" } }).sort({ timestamp: -1 }).limit(8).toArray()
      : Promise.resolve([]),
  ]);
  const checklists = subDocs.map(normalizeSubmission);
  const attention = docs.filter((d) => d.review.status === "returned" || d.review.status === "not_sent");
  const first = user.name.replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, "").split(" ")[0] || user.name;

  return (
    <>
      <PageHeader
        highlight={`Welcome, ${first}`}
        description={`Faculty · ${user.department || "Department not set"}`}
        actions={<Button asChild><Link href="/documents"><FolderOpen />Open Document Library</Link></Button>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="My documents" value={docs.length} />
        <Stat label="Approved" value={docs.filter((d) => d.review.status === "approved").length} tone="success" />
        <Stat label="With HOD" value={docs.filter((d) => d.review.status === "pending").length} tone="warning" />
        <Stat label="Need changes" value={attention.length} tone={attention.length ? "danger" : "default"} />
      </div>

      {attention.length > 0 && (
        <Notice tone="danger" title={`${attention.length} document${attention.length === 1 ? " needs" : "s need"} your attention`}>
          <ul className="mt-1 flex flex-col gap-1">
            {attention.map((d) => (
              <li key={d._id}>
                <strong>{docType(d.doc_type)?.label}</strong> · {d.course_code} ({d.semester}):{" "}
                {d.review.status === "returned" ? `returned by ${d.review.by}${d.review.remarks ? ` — ${d.review.remarks}` : ""}` : d.check.notes[0] ?? "did not pass the automatic check"}
              </li>
            ))}
          </ul>
          <p className="mt-2"><Link href="/documents" className="font-semibold text-link hover:underline">Upload a corrected version in the Document Library</Link></p>
        </Notice>
      )}

      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>My recent uploads</CardTitle>
          </CardHeader>
          <Table>
            <THead><tr><TH>Document</TH><TH>Course</TH><TH>Check</TH><TH>Review</TH><TH>Updated</TH></tr></THead>
            <TBody>
              {docs.slice(0, 10).map((d) => (
                <TR key={d._id}>
                  <TD><a href={`/api/documents/${d._id}/file`} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">{docType(d.doc_type)?.label}</a></TD>
                  <TD>{d.course_code}<span className="block text-xs text-muted-foreground">{d.semester}</span></TD>
                  <TD><CheckBadge status={d.check.status} /></TD>
                  <TD><ReviewBadge status={d.review.status} /></TD>
                  <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(d.uploaded_at)}</TD>
                </TR>
              ))}
              {docs.length === 0 && <EmptyRow colSpan={5}>Nothing uploaded yet. Open the Document Library to upload your first course document.</EmptyRow>}
            </TBody>
          </Table>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checklists from your HOD</CardTitle>
            <CardDescription>Fill one for your courses. Items already answered by documents in the library are ticked for you.</CardDescription>
          </CardHeader>
          {checklists.length === 0 ? (
            <CardContent className="text-[13.5px] text-muted-foreground">No checklists shared with your department yet.</CardContent>
          ) : (
            <ul className="divide-y border-t">
              {checklists.map((c) => (
                <li key={c._id} className="flex items-center justify-between gap-3 px-[18px] py-3">
                  <span className="min-w-0">
                    <span className="block font-semibold text-primary">{MODULES[c.form_type].label}</span>
                    <span className="block text-xs text-muted-foreground">{c.identity.semester || "Semester not set"} · HOD {c.identity.hodName || "—"}{c.identity.hodDeadline && ` · by ${c.identity.hodDeadline}`}</span>
                  </span>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/faculty-form/${c.share_token}`}>Fill<ArrowRight /></Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {!user.impersonatedBy && (
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm hasPassword={user.hasPassword} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
