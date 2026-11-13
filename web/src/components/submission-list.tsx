"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteSubmission } from "@/app/actions/submissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyRow } from "@/components/ui/page";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { MODULES } from "@/lib/constants";
import type { Submission } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export function SubmissionTable({
  submissions,
  currentEmail,
  isAdmin,
  showModule = false,
  canWrite = true,
  emptyText = "No submissions yet.",
}: {
  submissions: Submission[];
  currentEmail: string;
  isAdmin: boolean;
  showModule?: boolean;
  canWrite?: boolean;
  emptyText?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(sub: Submission) {
    const what = `${MODULES[sub.form_type].label} — ${sub.identity.dept || "untitled"} (${sub.identity.semester || "no semester"})`;
    const extra = sub.faculty_submission_count ? ` and its ${sub.faculty_submission_count} faculty response(s)` : "";
    if (!window.confirm(`Delete "${what}"${extra}? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteSubmission(sub._id);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Submission deleted.");
      router.refresh();
    });
  }

  return (
    <Table>
      <THead>
        <tr>
          <TH>Department</TH>
          {showModule && <TH>Module</TH>}
          <TH>Semester</TH>
          <TH>Campus</TH>
          <TH>HOD</TH>
          <TH>Status</TH>
          <TH className="text-right">Faculty</TH>
          <TH>Last updated</TH>
          <TH className="text-right">Actions</TH>
        </tr>
      </THead>
      <TBody>
        {submissions.map((sub) => {
          const mine = isAdmin || sub.identity.submitterEmail.toLowerCase() === currentEmail;
          const editable = mine && canWrite;
          return (
            <TR key={sub._id}>
              <TD>
                <Link href={`/${sub.form_type}/form/${sub._id}`} className="font-semibold text-primary hover:underline">
                  {sub.identity.dept || "Untitled submission"}
                </Link>
                {!mine && <span className="block text-xs text-muted-foreground">By {sub.identity.submitterName || sub.identity.submitterEmail}</span>}
              </TD>
              {showModule && <TD>{MODULES[sub.form_type].short}</TD>}
              <TD className="whitespace-nowrap">{sub.identity.semester || "—"}</TD>
              <TD>{sub.identity.campus || "—"}</TD>
              <TD>{sub.identity.hodName || "—"}</TD>
              <TD>
                <span className="flex flex-wrap gap-1">
                  <Badge variant={sub._draft ? "warning" : "success"}>{sub._draft ? "Draft" : "Submitted"}</Badge>
                  {sub.edit_request?.status === "pending" && <Badge variant="muted">Edit requested</Badge>}
                </span>
              </TD>
              <TD className="text-right tabular-nums">{sub.faculty_submission_count ?? 0}</TD>
              <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(sub.timestamp)}</TD>
              <TD>
                <div className="flex justify-end gap-1">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/${sub.form_type}/form/${sub._id}`}>
                      {editable ? <Pencil /> : <Eye />}
                      {editable ? (sub._draft ? "Continue" : "Open") : "View"}
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" asChild>
                    <a href={`/api/export/${sub._id}`} aria-label="Download Excel" title="Download Excel"><Download /></a>
                  </Button>
                  {mine && (
                    <Button variant="ghost" size="icon" className="text-destructive" aria-label="Delete submission" title="Delete" disabled={pending} onClick={() => remove(sub)}>
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </TD>
            </TR>
          );
        })}
        {submissions.length === 0 && <EmptyRow colSpan={showModule ? 9 : 8}>{emptyText}</EmptyRow>}
      </TBody>
    </Table>
  );
}
