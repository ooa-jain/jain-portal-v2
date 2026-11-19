"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, Check, CheckCircle2, ChevronDown, Download, FileText, History, Loader2, Search, ShieldCheck, Trash2,
  Undo2, Upload, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { deleteDocument, reviewDocument } from "@/app/actions/documents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { EmptyRow, Notice, Stat } from "@/components/ui/page";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { DOC_EXTENSIONS, DOC_TYPES, docType } from "@/lib/constants";
import type { LibraryDocument } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

type Me = { email: string; isAdmin: boolean; isFaculty: boolean; department: string };
type Course = { programme: string; course_code: string; course_name: string };

const typeLabel = (key: string) => docType(key)?.label ?? key;

export function CheckBadge({ status }: { status: LibraryDocument["check"]["status"] }) {
  if (status === "passed") return <Badge variant="success"><CheckCircle2 />Check passed</Badge>;
  if (status === "warnings") return <Badge variant="warning"><AlertTriangle />Check: notes</Badge>;
  return <Badge variant="destructive"><XCircle />Check failed</Badge>;
}

export function ReviewBadge({ status }: { status: LibraryDocument["review"]["status"] }) {
  if (status === "approved") return <Badge variant="success">Approved</Badge>;
  if (status === "returned") return <Badge variant="destructive">Returned</Badge>;
  if (status === "not_sent") return <Badge variant="muted">Needs re-upload</Badge>;
  return <Badge variant="warning">With HOD</Badge>;
}

function canChange(me: Me, doc: LibraryDocument) {
  return me.isAdmin || doc.uploaded_by_email === me.email || (!me.isFaculty && doc.dept === me.department);
}
function canReview(me: Me, doc: LibraryDocument) {
  return me.isAdmin || (!me.isFaculty && doc.dept === me.department);
}

// ── Upload ──────────────────────────────────────────────────────────

type Prefill = { programme?: string; course_code?: string; course_name?: string; semester?: string; doc_type?: string };

function UploadDialog({
  open,
  onClose,
  prefill,
  courses,
  semesters,
  departments,
  dept,
}: {
  open: boolean;
  onClose: () => void;
  prefill: Prefill;
  courses: Course[];
  semesters: string[];
  departments: string[];
  dept: string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    dept,
    programme: prefill.programme ?? "",
    course_code: prefill.course_code ?? "",
    course_name: prefill.course_name ?? "",
    semester: prefill.semester ?? semesters[0] ?? "",
    doc_type: prefill.doc_type ?? "tlep",
  });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LibraryDocument | null>(null);
  const [error, setError] = useState("");
  const fromList = courses.find((c) => c.course_code === form.course_code);

  async function upload() {
    if (!file) return setError("Choose a file to upload.");
    setBusy(true);
    setError("");
    const body = new FormData();
    Object.entries(form).forEach(([k, v]) => body.append(k, v));
    body.append("file", file);
    try {
      const response = await fetch("/api/documents", { method: "POST", body });
      const data = await response.json().catch(() => null);
      if (data?.ok) {
        setResult(data.document);
        router.refresh();
      } else if (data?.error) {
        setError(data.error);
      } else if (response.status === 413) {
        // The web server refused the file before the portal saw it.
        setError("This file is larger than the server currently allows. Ask the portal administrator to raise the upload limit, or upload a smaller file.");
      } else if (response.status === 401) {
        setError("Your session has expired. Sign in again and retry.");
      } else {
        setError(`The server could not accept the upload (error ${response.status}). Please try again; if it keeps failing, contact the Office of Academic Affairs.`);
      }
    } catch {
      setError("Upload failed. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {result.check.status === "failed" ? "Uploaded, but it needs fixing" : "Uploaded and checked"}
              </DialogTitle>
              <DialogDescription>
                {typeLabel(result.doc_type)} · {result.course_code} {result.course_name} · {result.semester} · version {result.version}
              </DialogDescription>
            </DialogHeader>
            <CheckSummary doc={result} />
            <DialogFooter>
              <Button onClick={onClose}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Upload a course document</DialogTitle>
              <DialogDescription>
                It is checked automatically as soon as it is uploaded, then goes to the HOD for approval. Uploading again for
                the same course, semester and type replaces it and keeps the old version.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              {departments.length > 0 && (
                <Field label="Department" required className="sm:col-span-2">
                  <Select value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })}>
                    <option value="">Select department</option>
                    {departments.map((d) => <option key={d}>{d}</option>)}
                  </Select>
                </Field>
              )}
              <Field label="Document type" required className="sm:col-span-2">
                <Select value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })}>
                  <optgroup label="Semester Readiness">
                    {DOC_TYPES.filter((t) => t.phase === "readiness").map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </optgroup>
                  <optgroup label="Semester Closure">
                    {DOC_TYPES.filter((t) => t.phase === "closure").map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </optgroup>
                </Select>
              </Field>
              <Field label="Course" required className="sm:col-span-2" hint={courses.length ? "Pick a known course, or type a new course code below." : undefined}>
                {courses.length > 0 && (
                  <Select
                    aria-label="Known courses"
                    value={fromList ? form.course_code : ""}
                    onChange={(e) => {
                      const c = courses.find((x) => x.course_code === e.target.value);
                      setForm(c ? { ...form, course_code: c.course_code, course_name: c.course_name, programme: c.programme || form.programme } : { ...form, course_code: "", course_name: "" });
                    }}
                  >
                    <option value="">New course…</option>
                    {courses.map((c) => <option key={c.course_code} value={c.course_code}>{c.course_code} · {c.course_name}</option>)}
                  </Select>
                )}
              </Field>
              <Field label="Course code" required>
                <Input value={form.course_code} placeholder="e.g. 22CSE301" onChange={(e) => setForm({ ...form, course_code: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="Course name" required>
                <Input value={form.course_name} onChange={(e) => setForm({ ...form, course_name: e.target.value })} />
              </Field>
              <Field label="Programme">
                <Input value={form.programme} placeholder="e.g. B.Tech CSE" onChange={(e) => setForm({ ...form, programme: e.target.value })} />
              </Field>
              <Field label="Semester" required>
                <Select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}>
                  {semesters.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-[13px] font-semibold text-foreground">File <span className="text-destructive">*</span></p>
                <input ref={fileInput} type="file" accept={DOC_EXTENSIONS.join(",")} className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-input bg-muted px-4 py-5 text-left hover:border-primary"
                >
                  <Upload className="size-5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-primary">{file ? file.name : "Choose a file"}</span>
                    <span className="block text-xs text-muted-foreground">PDF, Word, PowerPoint, Excel or image · up to 20 MB</span>
                  </span>
                </button>
              </div>
            </div>
            {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2 text-[13px] text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={upload} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <Upload />}
                {busy ? "Uploading and checking…" : "Upload"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CheckSummary({ doc }: { doc: LibraryDocument }) {
  const tone = doc.check.status === "passed" ? "success" : doc.check.status === "warnings" ? "warning" : "danger";
  const title =
    doc.check.status === "passed"
      ? "Automatic check passed. Sent to the HOD for approval."
      : doc.check.status === "warnings"
        ? "Sent to the HOD, with these notes for them to look at:"
        : "Not sent to the HOD. Fix these and upload again:";
  return (
    <Notice tone={tone} title={title}>
      {doc.check.notes.length > 0 && (
        <ul className="mt-1 list-disc pl-5">
          {doc.check.notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}
      <p className="mt-1 text-xs">
        {doc.check.pages ? `${doc.check.pages} page${doc.check.pages === 1 ? "" : "s"} · ` : ""}
        {doc.check.courseCodeFound ? `Course code ${doc.course_code} found` : "Course code not found in the text"}
      </p>
    </Notice>
  );
}

// ── Document details and review ─────────────────────────────────────

function DocumentDialog({ doc, me, onClose, onReplace }: { doc: LibraryDocument; me: Me; onClose: () => void; onReplace: () => void }) {
  const router = useRouter();
  const [remarks, setRemarks] = useState(doc.review.remarks);
  const [pending, startTransition] = useTransition();

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) return void toast.error(result.error);
      toast.success(success);
      router.refresh();
      onClose();
    });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{typeLabel(doc.doc_type)}</DialogTitle>
          <DialogDescription>
            {doc.course_code} · {doc.course_name}{doc.programme && ` · ${doc.programme}`} · {doc.semester} · {doc.dept}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <CheckBadge status={doc.check.status} />
          <ReviewBadge status={doc.review.status} />
          <Badge variant="muted">Version {doc.version}</Badge>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <span className="flex min-w-0 items-center gap-2.5">
            <FileText className="size-5 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-semibold">{doc.file_name}</span>
              <span className="block text-xs text-muted-foreground">
                {(doc.size / 1024 / 1024).toFixed(2)} MB · by {doc.uploaded_by_name || doc.uploaded_by_email} · {formatDateTime(doc.uploaded_at)}
              </span>
            </span>
          </span>
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/documents/${doc._id}/file`} target="_blank" rel="noopener noreferrer"><Download />Open</a>
          </Button>
        </div>

        <CheckSummary doc={doc} />

        {doc.review.status !== "pending" && doc.review.by && (
          <p className="text-[13px] text-muted-foreground">
            <span className="font-semibold">{doc.review.status === "approved" ? "Approved" : "Returned"}</span> by {doc.review.by} on{" "}
            {formatDateTime(doc.review.at)}{doc.review.remarks && `: ${doc.review.remarks}`}
          </p>
        )}

        {canReview(me, doc) && doc.review.status !== "not_sent" && (
          <div className="flex flex-col gap-2 rounded-lg border bg-muted p-3">
            <p className="text-[13px] font-semibold text-primary">HOD review</p>
            <Textarea aria-label="Remarks" rows={2} className="min-h-10 bg-card" placeholder="Remarks (needed when returning)" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" disabled={pending} onClick={() => act(() => reviewDocument(doc._id, "returned", remarks), "Returned to the uploader.")}>
                <Undo2 />Return for changes
              </Button>
              <Button size="sm" disabled={pending} onClick={() => act(() => reviewDocument(doc._id, "approved", remarks), "Document approved.")}>
                <Check />Approve
              </Button>
            </div>
          </div>
        )}

        {doc.history.length > 0 && (
          <details className="rounded-lg border p-3 text-[13px]">
            <summary className="flex cursor-pointer items-center gap-2 font-semibold text-primary"><History className="size-4" />Earlier versions ({doc.history.length})</summary>
            <ul className="mt-2 divide-y">
              {[...doc.history].reverse().map((h) => (
                <li key={h.version} className="flex items-center justify-between gap-3 py-2">
                  <span>v{h.version} · {h.file_name} · {h.uploaded_by} · {formatDateTime(h.uploaded_at)}</span>
                  <a className="text-link hover:underline" href={`/api/documents/${doc._id}/file?v=${h.version}`} target="_blank" rel="noopener noreferrer">Open</a>
                </li>
              ))}
            </ul>
          </details>
        )}

        <DialogFooter className="sm:justify-between">
          {canChange(me, doc) ? (
            <Button variant="ghost" className="text-destructive" disabled={pending}
              onClick={() => window.confirm(`Delete this ${typeLabel(doc.doc_type)} and all its versions?`) && act(() => deleteDocument(doc._id), "Document deleted.")}>
              <Trash2 />Delete
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            {canChange(me, doc) && <Button variant="outline" onClick={onReplace}><Upload />Upload new version</Button>}
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Library ─────────────────────────────────────────────────────────

const DOT: Record<string, string> = {
  approved: "bg-success",
  pending: "bg-[#2563eb]",
  returned: "bg-destructive",
  not_sent: "bg-destructive",
  missing: "bg-secondary",
};

export function DocumentLibrary({
  documents,
  courses,
  semesters,
  initialSemester,
  dept,
  departments,
  me,
}: {
  documents: LibraryDocument[];
  courses: Course[];
  semesters: string[];
  initialSemester: string;
  dept: string;
  departments: string[];
  me: Me;
}) {
  const router = useRouter();
  const [view, setView] = useState<"course" | "all">("course");
  const [query, setQuery] = useState("");
  const [semester, setSemester] = useState(initialSemester);
  const [phase, setPhase] = useState<"" | "readiness" | "closure">("");
  const [status, setStatus] = useState("");
  const [uploadPrefill, setUploadPrefill] = useState<Prefill | null>(null);
  const [openDoc, setOpenDoc] = useState<LibraryDocument | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((d) => {
      if (semester && d.semester !== semester) return false;
      if (phase && docType(d.doc_type)?.phase !== phase) return false;
      if (status && d.review.status !== status) return false;
      return !q || [d.course_code, d.course_name, d.programme, d.file_name, d.uploaded_by_name, typeLabel(d.doc_type)].some((v) => v.toLowerCase().includes(q));
    });
  }, [documents, query, semester, phase, status]);

  const types = DOC_TYPES.filter((t) => !phase || t.phase === phase);

  // By course: every known course × required document type for the chosen semester.
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, Course>();
    for (const c of courses) map.set(c.course_code, c);
    for (const d of documents) if (!map.has(d.course_code)) map.set(d.course_code, { programme: d.programme, course_code: d.course_code, course_name: d.course_name });
    const list = [...map.values()].filter((c) => !q || [c.course_code, c.course_name, c.programme].some((v) => v.toLowerCase().includes(q)));
    const byProgramme = new Map<string, Course[]>();
    for (const c of list) {
      const key = c.programme || "Programme not set";
      byProgramme.set(key, [...(byProgramme.get(key) ?? []), c]);
    }
    return [...byProgramme.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [courses, documents, query]);

  const slot = (code: string, type: string) =>
    documents.find((d) => d.course_code === code && d.doc_type === type && (!semester || d.semester === semester));

  const stats = {
    total: filtered.length,
    approved: filtered.filter((d) => d.review.status === "approved").length,
    pending: filtered.filter((d) => d.review.status === "pending").length,
    fix: filtered.filter((d) => d.review.status === "returned" || d.review.status === "not_sent").length,
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Documents" value={stats.total} hint={semester || "All semesters"} />
        <Stat label="Approved" value={stats.approved} tone="success" progress={stats.total ? (stats.approved / stats.total) * 100 : 0} />
        <Stat label="Waiting for HOD" value={stats.pending} tone="warning" />
        <Stat label="Need changes" value={stats.fix} tone={stats.fix ? "danger" : "default"} hint="Returned, or failed the check" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="inline-flex rounded-full border bg-card p-1" role="tablist" aria-label="View">
            {([["course", "By course"], ["all", "All documents"]] as const).map(([v, label]) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}
                className={cn("rounded-full px-3.5 py-1.5 text-[13px] font-semibold", view === v ? "bg-primary text-white" : "text-foreground hover:bg-hover")}>
                {label}
              </button>
            ))}
          </div>
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-3 size-4 text-muted-foreground" />
            <Input aria-label="Search" placeholder="Search course, programme or file" className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {departments.length > 0 && (
            <Select aria-label="Department" className="w-auto max-w-60" value={dept} onChange={(e) => router.push(e.target.value ? `/documents?dept=${encodeURIComponent(e.target.value)}` : "/documents")}>
              <option value="">All departments</option>
              {departments.map((d) => <option key={d}>{d}</option>)}
            </Select>
          )}
          <Select aria-label="Semester" className="w-auto" value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option value="">All semesters</option>
            {semesters.map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Select aria-label="Phase" className="w-auto" value={phase} onChange={(e) => setPhase(e.target.value as typeof phase)}>
            <option value="">Readiness and Closure</option>
            <option value="readiness">Readiness documents</option>
            <option value="closure">Closure documents</option>
          </Select>
          {view === "all" && (
            <Select aria-label="Review status" className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Any status</option>
              <option value="pending">With HOD</option>
              <option value="approved">Approved</option>
              <option value="returned">Returned</option>
              <option value="not_sent">Needs re-upload</option>
            </Select>
          )}
          <Button className="ml-auto" onClick={() => setUploadPrefill({ semester })}><Upload />Upload document</Button>
        </div>

        {view === "course" ? (
          grouped.length === 0 ? (
            <p className="px-[18px] py-12 text-center text-[13.5px] text-muted-foreground">
              No courses yet. Upload a document to add the first course; courses from faculty checklists also appear here.
            </p>
          ) : (
            <div className="flex flex-col">
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-[18px] py-2.5 text-xs text-muted-foreground">
                {([["approved", "Approved"], ["pending", "With HOD"], ["returned", "Returned / needs re-upload"], ["missing", "Not uploaded"]] as const).map(([k, l]) => (
                  <span key={k} className="flex items-center gap-1.5"><span className={cn("size-2.5 rounded-full", DOT[k])} />{l}</span>
                ))}
                <span className="ml-auto">Click a cell to open or upload</span>
              </p>
              {grouped.map(([programme, list]) => (
                <details key={programme} open className="border-b last:border-b-0">
                  <summary className="flex cursor-pointer items-center gap-2 bg-muted px-[18px] py-2.5 text-[13.5px] font-bold text-primary">
                    <ChevronDown className="size-4" />{programme}<span className="font-normal text-muted-foreground">· {list.length} course{list.length === 1 ? "" : "s"}</span>
                  </summary>
                  <Table>
                    <THead>
                      <tr>
                        <TH>Course</TH>
                        {types.map((t) => <TH key={t.key} className="whitespace-normal text-center text-[11.5px] leading-tight" title={t.label}>{t.label.replace(/\s*\(.*\)$/, "")}</TH>)}
                        <TH className="text-right">Done</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {list.map((c) => {
                        const done = types.filter((t) => slot(c.course_code, t.key)?.review.status === "approved").length;
                        return (
                          <TR key={c.course_code}>
                            <TD className="min-w-52">
                              <span className="font-semibold text-primary">{c.course_code}</span>
                              <span className="block text-xs text-muted-foreground">{c.course_name}</span>
                            </TD>
                            {types.map((t) => {
                              const d = slot(c.course_code, t.key);
                              const state = d ? d.review.status : "missing";
                              return (
                                <TD key={t.key} className="text-center">
                                  <button
                                    type="button"
                                    title={d ? `${t.label}: ${d.file_name}` : `Upload ${t.label}`}
                                    aria-label={d ? `${c.course_code} ${t.label}, ${state}` : `Upload ${t.label} for ${c.course_code}`}
                                    disabled={!d && !semester}
                                    onClick={() => (d ? setOpenDoc(d) : setUploadPrefill({ ...c, semester, doc_type: t.key }))}
                                    className="inline-flex size-7 items-center justify-center rounded-full hover:bg-hover disabled:opacity-40"
                                  >
                                    <span className={cn("size-3 rounded-full", DOT[state], d?.check.status === "warnings" && state === "pending" && "ring-2 ring-warning/40 ring-offset-1")} />
                                  </button>
                                </TD>
                              );
                            })}
                            <TD className="text-right tabular-nums">{done}/{types.length}</TD>
                          </TR>
                        );
                      })}
                    </TBody>
                  </Table>
                </details>
              ))}
              {!semester && <p className="px-[18px] py-2.5 text-xs text-muted-foreground">Choose a semester to upload into empty cells.</p>}
            </div>
          )
        ) : (
          <>
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="sr-only">All documents</CardTitle>
              <CardDescription>{filtered.length} of {documents.length} documents</CardDescription>
            </CardHeader>
            <Table>
              <THead>
                <tr><TH>Document</TH><TH>Course</TH><TH>Semester</TH><TH>Uploaded by</TH><TH>Check</TH><TH>Review</TH><TH>Updated</TH></tr>
              </THead>
              <TBody>
                {filtered.map((d) => (
                  <TR key={d._id} className="cursor-pointer" onClick={() => setOpenDoc(d)}>
                    <TD>
                      <span className="font-semibold text-primary">{typeLabel(d.doc_type)}</span>
                      <span className="block max-w-64 truncate text-xs text-muted-foreground">{d.file_name} · v{d.version}</span>
                    </TD>
                    <TD>{d.course_code}<span className="block text-xs text-muted-foreground">{d.course_name}</span></TD>
                    <TD className="whitespace-nowrap">{d.semester}</TD>
                    <TD>{d.uploaded_by_name || d.uploaded_by_email}</TD>
                    <TD><CheckBadge status={d.check.status} /></TD>
                    <TD><ReviewBadge status={d.review.status} /></TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(d.uploaded_at)}</TD>
                  </TR>
                ))}
                {filtered.length === 0 && <EmptyRow colSpan={7}>No documents match these filters.</EmptyRow>}
              </TBody>
            </Table>
          </>
        )}
      </Card>

      {me.isFaculty && (
        <p className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
          <ShieldCheck className="size-4" />
          Documents you upload here also tick the matching items on your faculty checklist, so you never upload the same file twice.
        </p>
      )}

      {uploadPrefill && (
        <UploadDialog
          open
          onClose={() => setUploadPrefill(null)}
          prefill={uploadPrefill}
          courses={courses}
          semesters={semesters}
          departments={departments}
          dept={dept}
        />
      )}
      {openDoc && (
        <DocumentDialog
          doc={openDoc}
          me={me}
          onClose={() => setOpenDoc(null)}
          onReplace={() => {
            const d = openDoc;
            setOpenDoc(null);
            setUploadPrefill({ programme: d.programme, course_code: d.course_code, course_name: d.course_name, semester: d.semester, doc_type: d.doc_type });
          }}
        />
      )}
    </>
  );
}
