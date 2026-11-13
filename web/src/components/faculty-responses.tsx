"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteFaculty, reviewFaculty } from "@/app/actions/faculty";
import { ChecklistReadOnly } from "@/components/checklist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { facultySectionsFor } from "@/lib/constants";
import type { FacultySubmission } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

type ReviewStatus = "pending" | "reviewed" | "needs_changes";

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting review",
  reviewed: "Reviewed",
  approved: "Reviewed",
  needs_changes: "Needs changes",
};

function reviewBadge(status: string) {
  const variant = status === "pending" ? "warning" : status === "needs_changes" ? "destructive" : "success";
  return <Badge variant={variant}>{STATUS_LABEL[status] ?? status}</Badge>;
}

function ResponseCard({
  response,
  canReview,
  canDelete,
}: {
  response: FacultySubmission;
  canReview: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ReviewStatus>(
    response.hod_review_status === "needs_changes"
      ? "needs_changes"
      : response.hod_review_status === "pending"
        ? "pending"
        : "reviewed",
  );
  const [remarks, setRemarks] = useState(response.hod_remarks);
  const [pending, startTransition] = useTransition();

  const answers = Object.values(response.checklist);
  const yes = answers.filter((a) => a.status === "Yes").length;
  const no = answers.filter((a) => a.status === "No").length;

  function save() {
    startTransition(async () => {
      const result = await reviewFaculty(response._id, status === "pending" ? "reviewed" : status, remarks);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Review saved.");
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm(`Delete the response from ${response.faculty_name} for ${response.course_name}? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteFaculty(response._id);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Response deleted.");
      router.refresh();
    });
  }

  return (
    <li className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            {response.faculty_name}
            <span className="font-normal text-muted-foreground"> · {response.course_name}</span>
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {[response.course_code, response.program, response.year_sem].filter(Boolean).join(" · ")} · {formatDateTime(response.timestamp)}
          </span>
        </span>
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
          {yes} Yes{no > 0 && <span className="font-medium text-destructive"> · {no} No</span>}
        </span>
        {reviewBadge(response.hod_review_status)}
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="flex flex-col gap-6 border-t p-4">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="break-all">{response.faculty_email || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Program · Year/Sem</dt>
              <dd>{[response.program, response.year_sem].filter(Boolean).join(" · ") || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Students</dt>
              <dd>{response.no_of_students || "—"}</dd>
            </div>
          </dl>

          <ChecklistReadOnly sections={facultySectionsFor(response.form_type)} value={response.checklist} />

          {canReview ? (
            <div className="flex flex-col gap-3 rounded-lg bg-muted/60 p-4">
              <p className="text-sm font-semibold">HOD review</p>
              <div className="grid gap-3 sm:grid-cols-[14rem_1fr]">
                <Select
                  aria-label="Review decision"
                  value={status === "pending" ? "reviewed" : status}
                  onChange={(event) => setStatus(event.target.value as ReviewStatus)}
                >
                  <option value="reviewed">Reviewed — accepted</option>
                  <option value="needs_changes">Needs changes</option>
                </Select>
                <Textarea
                  aria-label="Remarks for the faculty member"
                  placeholder="Remarks (optional)"
                  className="min-h-10"
                  rows={2}
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                {canDelete ? (
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={remove} disabled={pending}>
                    <Trash2 />
                    Delete response
                  </Button>
                ) : (
                  <span />
                )}
                <Button size="sm" onClick={save} disabled={pending}>
                  {pending && <Loader2 className="animate-spin" />}
                  Save review
                </Button>
              </div>
            </div>
          ) : (
            response.hod_remarks && (
              <p className="rounded-lg bg-muted/60 p-4 text-sm">
                <span className="font-semibold">HOD remarks: </span>
                {response.hod_remarks}
              </p>
            )
          )}
        </div>
      )}
    </li>
  );
}

export function FacultyResponses({
  responses,
  canReview,
  canDelete,
}: {
  responses: FacultySubmission[];
  canReview: boolean;
  canDelete: boolean;
}) {
  if (responses.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No faculty responses yet. They appear here as soon as faculty submit through your link.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {responses.map((response) => (
        <ResponseCard key={response._id} response={response} canReview={canReview} canDelete={canDelete} />
      ))}
    </ul>
  );
}
