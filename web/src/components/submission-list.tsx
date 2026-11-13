"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { deleteSubmission } from "@/app/actions/submissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MODULES } from "@/lib/constants";
import type { Submission } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export function SubmissionList({
  submissions,
  currentEmail,
  isAdmin,
  showModule = false,
}: {
  submissions: Submission[];
  currentEmail: string;
  isAdmin: boolean;
  showModule?: boolean;
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
    <ul className="flex flex-col gap-3">
      {submissions.map((sub) => {
        const mine = isAdmin || sub.identity.submitterEmail.toLowerCase() === currentEmail;
        return (
          <li key={sub._id} className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:p-5">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <Link href={`/${sub.form_type}/form/${sub._id}`} className="font-semibold hover:underline">
                  {sub.identity.dept || "Untitled submission"}
                </Link>
                <Badge variant={sub._draft ? "warning" : "success"}>{sub._draft ? "Draft" : "Submitted"}</Badge>
                {showModule && <Badge>{MODULES[sub.form_type].short}</Badge>}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {[sub.identity.semester, sub.identity.campus, sub.identity.hodName].filter(Boolean).join(" · ") || "Details not filled yet"}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-4 text-xs text-muted-foreground">
                <span>
                  {sub._draft ? "Last saved" : "Submitted"} {formatDateTime(sub.timestamp)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" />
                  {sub.faculty_submission_count ?? 0} faculty response{sub.faculty_submission_count === 1 ? "" : "s"}
                </span>
                {!mine && <span>By {sub.identity.submitterName || sub.identity.submitterEmail}</span>}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant={mine ? "default" : "outline"} size="sm" asChild>
                <Link href={`/${sub.form_type}/form/${sub._id}`}>
                  <Pencil />
                  {mine ? (sub._draft ? "Continue" : "Open") : "View"}
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={`/api/export/${sub._id}`}>
                  <Download />
                  Excel
                </a>
              </Button>
              {mine && (
                <Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label="Delete submission" disabled={pending} onClick={() => remove(sub)}>
                  <Trash2 />
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
