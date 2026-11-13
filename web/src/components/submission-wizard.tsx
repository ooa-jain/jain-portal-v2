"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Copy, Download, Loader2, Mail, RefreshCw, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { saveSubmission } from "@/app/actions/submissions";
import { sendFacultyLink } from "@/app/actions/faculty";
import { ChecklistEditor, ChecklistReadOnly, RemarkText, UploadButton } from "@/components/checklist";
import { FacultyResponses } from "@/components/faculty-responses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  CAMPUSES,
  DEPARTMENTS,
  HOD_CLOSURE_SECTIONS,
  HOD_SECTIONS,
  MID_SEM_ITEM_ID,
  MODULES,
  type ModuleKey,
} from "@/lib/constants";
import type { Checklist, FacultySubmission, Report, Submission } from "@/lib/types";
import { cn } from "@/lib/utils";

type IdentityFields = {
  campus: string;
  dept: string;
  hodName: string;
  hodEmail: string;
  semester: string;
  acYear: string;
  subDate: string;
  hodDeadline: string;
};

export type WizardProps = {
  module: ModuleKey;
  submission: Submission | null;
  faculty: FacultySubmission[];
  canEdit: boolean;
  years: string[];
  semesters: string[];
  defaults: { name: string; email: string; department: string };
  mailEnabled: boolean;
  initialStep?: number;
};

function emptyReport(): Report {
  return Object.fromEntries(
    HOD_CLOSURE_SECTIONS.map((s) => [s.id, { title: s.title, text: "", link: "", file_url: "" }]),
  );
}

function today() {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
}

export function SubmissionWizard(props: WizardProps) {
  const { module, submission, faculty, canEdit, years, semesters, defaults, mailEnabled, initialStep = 0 } = props;
  const router = useRouter();
  const meta = MODULES[module];
  const steps = [
    "Details",
    module === "readiness" ? "HOD checklist" : "HOD report",
    "Faculty checklists",
    "Review & submit",
  ];

  const [step, setStep] = useState(Math.min(Math.max(initialStep, 0), 3));
  const [id, setId] = useState(submission?._id ?? "");
  const [shareToken, setShareToken] = useState(submission?.share_token ?? "");
  const [isDraft, setIsDraft] = useState(submission ? submission._draft : true);
  const [identity, setIdentity] = useState<IdentityFields>(() => ({
    campus: submission?.identity.campus ?? "",
    dept: submission?.identity.dept ?? defaults.department,
    hodName: submission?.identity.hodName ?? defaults.name,
    hodEmail: submission?.identity.hodEmail ?? defaults.email,
    semester: submission?.identity.semester ?? "",
    acYear: submission?.identity.acYear ?? "",
    subDate: submission?.identity.subDate ?? today(),
    hodDeadline: submission?.identity.hodDeadline ?? "",
  }));
  const [checklist, setChecklist] = useState<Checklist>(submission?.hodChecklist ?? {});
  const [report, setReport] = useState<Report>(() => ({ ...emptyReport(), ...(submission?.hodReport ?? {}) }));
  const [dirty, setDirty] = useState(false);
  const [saving, startSaving] = useTransition();

  const semesterOptions = useMemo(() => {
    const options = years.flatMap((year) => semesters.map((sem) => `${sem} ${year}`));
    // Keep a stored value selectable even if admin has since disabled that year.
    if (identity.semester && !options.includes(identity.semester)) options.unshift(identity.semester);
    return options;
  }, [years, semesters, identity.semester]);
  const yearOptions = useMemo(
    () => (identity.acYear && !years.includes(identity.acYear) ? [identity.acYear, ...years] : years),
    [years, identity.acYear],
  );

  const setField = (key: keyof IdentityFields, value: string) => {
    setIdentity((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const missingDetails = [
    !identity.campus && "campus",
    !identity.dept && "department",
    !identity.hodName && "HOD name",
    !identity.hodEmail && "HOD email",
    !identity.semester && "semester",
    !identity.acYear && "academic year",
  ].filter(Boolean) as string[];

  /**
   * Save to the server. Returns "saved", "failed", or "moved" when a brand-new
   * submission was created: the page then reloads at its permanent address
   * (opening on `landOn`), so the caller must not touch local state afterwards.
   */
  async function persist(draft: boolean, landOn: number): Promise<"saved" | "moved" | "failed"> {
    const result = await saveSubmission({
      id: id || undefined,
      form_type: module,
      draft,
      identity,
      hodChecklist: checklist,
      hodReport: report,
    });
    if (!result.ok) {
      toast.error(result.error);
      return "failed";
    }
    setDirty(false);
    if (!id && draft) {
      router.replace(`/${module}/form/${result.id}?step=${landOn + 1}`);
      return "moved";
    }
    setId(result.id);
    setShareToken(result.shareToken);
    return "saved";
  }

  function goTo(next: number) {
    if (next === step) return;
    // Moving on from Details needs the fields that identify the submission.
    if (canEdit && step === 0 && next > 0 && missingDetails.length > 0) {
      toast.error(`Please fill in: ${missingDetails.join(", ")}.`);
      return;
    }
    const move = () => {
      setStep(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    // Autosave when leaving a step with changes, or when the faculty link is needed.
    if (canEdit && (dirty || (next === 2 && !shareToken))) {
      startSaving(async () => {
        if ((await persist(true, next)) === "saved") move();
      });
    } else {
      move();
    }
  }

  function saveDraft() {
    startSaving(async () => {
      if ((await persist(true, step)) !== "failed") toast.success(isDraft ? "Draft saved." : "Changes saved.");
    });
  }

  function submitFinal() {
    if (missingDetails.length > 0) {
      setStep(0);
      toast.error(`Please fill in: ${missingDetails.join(", ")}.`);
      return;
    }
    if (module === "readiness" && !checklist[MID_SEM_ITEM_ID]?.status) {
      setStep(1);
      toast.error("Enter the Mid Sem Review Date (item 28) before submitting.");
      return;
    }
    startSaving(async () => {
      if ((await persist(false, step)) !== "failed") {
        setIsDraft(false);
        toast.success(`${meta.label} submitted.`);
        router.push(`/${module}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/${module}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            All {meta.short.toLowerCase()} submissions
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{meta.label}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {identity.dept || "New submission"}
            {identity.semester && <span>· {identity.semester}</span>}
            {id ? (
              <Badge variant={isDraft ? "warning" : "success"}>{isDraft ? "Draft" : "Submitted"}</Badge>
            ) : (
              <Badge variant="muted">Not saved yet</Badge>
            )}
            {!canEdit && <Badge variant="muted">View only</Badge>}
          </p>
        </div>
        {canEdit && (
          <Button variant="outline" onClick={saveDraft} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {isDraft ? "Save draft" : "Save changes"}
          </Button>
        )}
      </div>

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {steps.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => goTo(index)}
              disabled={saving}
              aria-current={index === step ? "step" : undefined}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                index === step
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs",
                  index === step ? "bg-accent text-accent-foreground" : index < step ? "bg-success-soft text-success" : "bg-muted",
                )}
              >
                {index < step ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span className="truncate">{label}</span>
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Department and semester</CardTitle>
            <CardDescription>These details appear on the faculty checklist and in every export.</CardDescription>
          </CardHeader>
          <CardContent>
            <fieldset disabled={!canEdit} className="grid gap-5 sm:grid-cols-2">
              <Field label="Campus" required>
                <Select value={identity.campus} onChange={(e) => setField("campus", e.target.value)}>
                  <option value="">Select campus</option>
                  {CAMPUSES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Department" required>
                <Select value={identity.dept} onChange={(e) => setField("dept", e.target.value)}>
                  <option value="">Select department</option>
                  {(identity.dept && !DEPARTMENTS.includes(identity.dept) ? [identity.dept, ...DEPARTMENTS] : DEPARTMENTS).map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </Select>
              </Field>
              <Field label="HOD full name" required>
                <Input value={identity.hodName} placeholder="Dr. / Prof. full name" onChange={(e) => setField("hodName", e.target.value)} />
              </Field>
              <Field label="HOD email" required>
                <Input type="email" value={identity.hodEmail} placeholder="hod@jainuniversity.ac.in" onChange={(e) => setField("hodEmail", e.target.value)} />
              </Field>
              <Field label="Semester" required>
                <Select value={identity.semester} onChange={(e) => setField("semester", e.target.value)}>
                  <option value="">Select semester</option>
                  {semesterOptions.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Academic year" required>
                <Select value={identity.acYear} onChange={(e) => setField("acYear", e.target.value)}>
                  <option value="">Select academic year</option>
                  {yearOptions.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Submission date">
                <Input type="date" value={identity.subDate} onChange={(e) => setField("subDate", e.target.value)} />
              </Field>
              <Field label="Last day for faculty checklists" hint="Shown to faculty on their checklist form.">
                <Input type="date" value={identity.hodDeadline} onChange={(e) => setField("hodDeadline", e.target.value)} />
              </Field>
            </fieldset>
          </CardContent>
        </Card>
      )}

      {step === 1 && module === "readiness" && (
        <Card>
          <CardHeader>
            <CardTitle>HOD readiness checklist</CardTitle>
            <CardDescription>
              Answer each item. Add a note or attach evidence where it helps. Item 28 takes the mid-semester review date.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChecklistEditor
              sections={HOD_SECTIONS}
              value={checklist}
              disabled={!canEdit}
              dateItemId={MID_SEM_ITEM_ID}
              onChange={(next) => {
                setChecklist(next);
                setDirty(true);
              }}
            />
          </CardContent>
        </Card>
      )}

      {step === 1 && module === "closure" && (
        <div className="flex flex-col gap-4">
          {HOD_CLOSURE_SECTIONS.map((section) => {
            const answer = report[section.id];
            const update = (patch: Partial<Report[string]>) => {
              setReport((prev) => ({ ...prev, [section.id]: { ...prev[section.id], ...patch } }));
              setDirty(true);
            };
            return (
              <Card key={section.id}>
                <CardHeader>
                  <CardTitle className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs text-primary">
                      {section.id}
                    </span>
                    {section.title}
                  </CardTitle>
                  <CardDescription className="pl-9">{section.hint}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <Textarea
                    aria-label={section.title}
                    placeholder="Write your narrative here"
                    rows={4}
                    disabled={!canEdit}
                    value={answer.text}
                    onChange={(e) => update({ text: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Input
                      aria-label={`Link for ${section.title}`}
                      placeholder="Supporting link (optional)"
                      disabled={!canEdit}
                      value={answer.link}
                      onChange={(e) => update({ link: e.target.value })}
                    />
                    <UploadButton disabled={!canEdit} onUploaded={(url) => update({ file_url: url })} />
                  </div>
                  {answer.file_url && (
                    <p className="flex items-center gap-3 text-sm">
                      <a href={answer.file_url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                        View attached file
                      </a>
                      {canEdit && (
                        <button type="button" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => update({ file_url: "" })}>
                          Remove
                        </button>
                      )}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {step === 2 && (
        <FacultyStep
          submissionId={id}
          shareToken={shareToken}
          faculty={faculty}
          canEdit={canEdit}
          mailEnabled={mailEnabled}
          module={module}
        />
      )}

      {step === 3 && (
        <ReviewStep module={module} identity={identity} checklist={checklist} report={report} facultyCount={faculty.length} />
      )}

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => goTo(step - 1)} disabled={step === 0 || saving}>
          <ArrowLeft />
          Back
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={() => goTo(step + 1)} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Next: {steps[step + 1]}
            <ArrowRight />
          </Button>
        ) : (
          canEdit && (
            <Button variant="accent" size="lg" onClick={submitFinal} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Send />}
              {isDraft ? `Submit ${meta.short.toLowerCase()}` : "Save and resubmit"}
            </Button>
          )
        )}
      </div>
    </div>
  );
}

function FacultyStep({
  submissionId,
  shareToken,
  faculty,
  canEdit,
  mailEnabled,
  module,
}: {
  submissionId: string;
  shareToken: string;
  faculty: FacultySubmission[];
  canEdit: boolean;
  mailEnabled: boolean;
  module: ModuleKey;
}) {
  const router = useRouter();
  const [emails, setEmails] = useState("");
  const [sending, startSending] = useTransition();
  const [refreshing, startRefresh] = useTransition();
  const link = shareToken && typeof window !== "undefined" ? `${window.location.origin}/faculty-form/${shareToken}` : "";
  const pendingCount = faculty.filter((f) => f.hod_review_status === "pending").length;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied.");
    } catch {
      toast.error("Could not copy. Select the link and copy it manually.");
    }
  }

  function send() {
    const recipients = emails
      .split(/[\s,;]+/)
      .map((e) => e.trim())
      .filter(Boolean)
      .map((email) => ({ name: "", email }));
    if (recipients.length === 0) return void toast.error("Enter at least one email address.");
    startSending(async () => {
      const result = await sendFacultyLink(submissionId, recipients);
      if (!result.ok) return void toast.error(result.error);
      if (result.sent.length > 0) toast.success(`Link sent to ${result.sent.length} faculty.`);
      if (result.failed.length > 0) toast.error(`Could not send to: ${result.failed.join(", ")}`);
      if (result.failed.length === 0) setEmails("");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Faculty checklist link</CardTitle>
          <CardDescription>
            Share this link with your faculty. Each faculty member fills the {module === "closure" ? "closure" : "readiness"} checklist
            for their courses; no sign-in is needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input readOnly aria-label="Faculty checklist link" value={link} onFocus={(e) => e.target.select()} className="font-mono text-xs" />
            <Button variant="outline" onClick={copy} disabled={!link}>
              <Copy />
              Copy
            </Button>
          </div>
          {canEdit && mailEnabled && (
            <div className="flex flex-col gap-2 border-t pt-4">
              <label htmlFor="faculty-emails" className="text-sm font-medium">
                Email the link
              </label>
              <Textarea
                id="faculty-emails"
                rows={2}
                className="min-h-10"
                placeholder="Faculty email addresses, separated by commas or new lines"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
              />
              <div>
                <Button variant="secondary" size="sm" onClick={send} disabled={sending}>
                  {sending ? <Loader2 className="animate-spin" /> : <Mail />}
                  Send link
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Faculty responses ({faculty.length})</CardTitle>
            <CardDescription>
              {pendingCount > 0 ? `${pendingCount} awaiting your review. ` : ""}Open a response to see the checklist and record your review.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => startRefresh(() => router.refresh())} disabled={refreshing}>
            <RefreshCw className={cn(refreshing && "animate-spin")} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <FacultyResponses responses={faculty} canReview canDelete={canEdit} />
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}

function ReviewStep({
  module,
  identity,
  checklist,
  report,
  facultyCount,
}: {
  module: ModuleKey;
  identity: IdentityFields;
  checklist: Checklist;
  report: Report;
  facultyCount: number;
}) {
  const scored = HOD_SECTIONS.flatMap((s) => s.items).filter((i) => i.id !== MID_SEM_ITEM_ID);
  const status = (itemId: string) => checklist[itemId]?.status ?? "";
  const yes = scored.filter((i) => status(i.id) === "Yes").length;
  const no = scored.filter((i) => status(i.id) === "No");
  const na = scored.filter((i) => status(i.id) === "N/A").length;
  const blank = scored.length - yes - no.length - na;
  const unfilled = HOD_CLOSURE_SECTIONS.filter((s) => !report[s.id]?.text.trim());

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-4">
            <SummaryRow label="Campus" value={identity.campus} />
            <SummaryRow label="Department" value={identity.dept} />
            <SummaryRow label="HOD" value={identity.hodName} />
            <SummaryRow label="HOD email" value={identity.hodEmail} />
            <SummaryRow label="Semester" value={identity.semester} />
            <SummaryRow label="Academic year" value={identity.acYear} />
            <SummaryRow label="Faculty deadline" value={identity.hodDeadline} />
            <SummaryRow label="Faculty responses" value={String(facultyCount)} />
          </dl>
        </CardContent>
      </Card>

      {module === "readiness" ? (
        <Card>
          <CardHeader>
            <CardTitle>HOD checklist summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { label: "Yes", value: yes, tone: "text-success" },
                { label: "No", value: no.length, tone: no.length ? "text-destructive" : "" },
                { label: "N/A", value: na, tone: "" },
                { label: "Not answered", value: blank, tone: blank ? "text-warning" : "" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg bg-muted/60 p-3">
                  <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                  <dd className={cn("text-2xl font-semibold", stat.tone)}>{stat.value}</dd>
                </div>
              ))}
              <div className="col-span-2 rounded-lg bg-muted/60 p-3 sm:col-span-1">
                <dt className="text-xs text-muted-foreground">Mid Sem Review</dt>
                <dd className="text-sm font-semibold leading-8">{status(MID_SEM_ITEM_ID) || "Not set"}</dd>
              </div>
            </dl>
            {no.length > 0 && (
              <div className="rounded-lg bg-destructive-soft p-4">
                <p className="text-sm font-semibold text-destructive">
                  {no.length} item{no.length > 1 ? "s" : ""} marked No
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {no.map((item) => (
                    <li key={item.id}>
                      {item.id}. {item.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {blank > 0 && (
              <p className="rounded-lg bg-warning-soft p-4 text-sm text-warning">
                {blank} item{blank > 1 ? "s are" : " is"} not answered. You can still submit, and edit later.
              </p>
            )}
            <ChecklistReadOnly sections={HOD_SECTIONS} value={checklist} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>HOD closure report</CardTitle>
            <CardDescription>
              {HOD_CLOSURE_SECTIONS.length - unfilled.length} of {HOD_CLOSURE_SECTIONS.length} sections filled.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {unfilled.length > 0 && (
              <p className="rounded-lg bg-warning-soft p-4 text-sm text-warning">
                Not filled yet: {unfilled.map((s) => s.id).join(", ")}. You can still submit, and edit later.
              </p>
            )}
            <ul className="divide-y">
              {HOD_CLOSURE_SECTIONS.map((section) => {
                const answer = report[section.id];
                return (
                  <li key={section.id} className="flex flex-col gap-1 py-3">
                    <p className="text-sm font-semibold">
                      {section.id}. {section.title}
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{answer?.text || "—"}</p>
                    {answer?.link && <RemarkText text={answer.link} />}
                    {answer?.file_url && <RemarkText text={answer.file_url} />}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function ExportLinks({ id }: { id: string }) {
  return (
    <Button variant="outline" size="sm" asChild>
      <a href={`/api/export/${id}`}>
        <Download />
        Excel
      </a>
    </Button>
  );
}
