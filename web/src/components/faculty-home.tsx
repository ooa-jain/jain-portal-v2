import Link from "next/link";
import { FolderOpen } from "lucide-react";
import type { CurrentUser } from "@/lib/auth";
import { listDocuments } from "@/lib/documents";
import { docType } from "@/lib/constants";
import { FacultyChecklists } from "@/components/faculty-checklists";
import { CheckBadge, ReviewBadge } from "@/components/document-library";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyRow, Notice } from "@/components/ui/page";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

/** Home for faculty accounts: checklists to fill and submitted, their documents, and what needs fixing. */
export async function FacultyHome({ user }: { user: CurrentUser }) {
  const docs = await listDocuments({ uploaded_by_email: user.email });
  const attention = docs.filter((d) => d.review.status === "returned" || d.review.status === "not_sent");
  const first = user.name.split(/\s+/).find((part) => !/^(dr|prof|mr|mrs|ms|miss|shri|smt)\.?$/i.test(part)) ?? user.name;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-primary">
            Welcome back, <span className="hl hl-on">{first}</span>
          </h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">Faculty · {user.department || "Department not set"}</p>
        </div>
        <Button asChild>
          <Link href="/documents"><FolderOpen />Open Document Library</Link>
        </Button>
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

      <FacultyChecklists user={user} limit={5} />

      <Card>
        <div className="flex items-center justify-between border-b bg-accent-soft px-4 py-3">
          <h2 className="text-[15px] font-bold text-primary">My recent uploads</h2>
          <Link href="/documents" className="text-[13px] font-semibold text-link hover:underline">Document Library →</Link>
        </div>
        <Table>
          <THead><tr><TH>Document</TH><TH>Course</TH><TH>Check</TH><TH>Review</TH><TH>Updated</TH></tr></THead>
          <TBody>
            {docs.slice(0, 8).map((d) => (
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
    </>
  );
}
