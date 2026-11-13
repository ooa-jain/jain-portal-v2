"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Loader2, Plus, Save, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { saveIea, sendIeaFeedback, submitIea } from "@/app/actions/iea";
import { UploadButton } from "@/components/checklist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Notice } from "@/components/ui/page";
import { IEA_EVIDENCE_TYPES, IEA_SECTIONS, IEA_YEARS, type IeaSection } from "@/lib/constants";
import type { IeaEntry, IeaSubmission, IeaYears } from "@/lib/types";
import { cn, formatDateTime, str } from "@/lib/utils";

function emptyYears(): IeaYears {
  return Object.fromEntries(IEA_YEARS.map((y) => [y, Object.fromEntries(IEA_SECTIONS.map((s) => [s.key, [] as IeaEntry[]]))]));
}

function newEntry(section: IeaSection): IeaEntry {
  const entry: IeaEntry = {
    id: Math.random().toString(36).slice(2, 10),
    evidenceTypes: [],
    evidenceLink: "",
    evidenceMissing: "",
    evidenceDetails: {},
  };
  for (const field of section.fields) entry[field.k] = "";
  return entry;
}

function isFilled(entry: IeaEntry, section: IeaSection) {
  return (
    section.fields.some((f) => str(entry[f.k]).trim()) ||
    entry.evidenceTypes.length > 0 ||
    Boolean(entry.evidenceMissing.trim())
  );
}

function EntryCard({
  entry,
  index,
  section,
  disabled,
  onChange,
  onRemove,
}: {
  entry: IeaEntry;
  index: number;
  section: IeaSection;
  disabled: boolean;
  onChange: (next: IeaEntry) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(!isFilled(entry, section));
  const title = str(entry[section.fields[0].k]).trim() || `Entry ${index + 1}`;

  function toggleType(type: string, checked: boolean) {
    const types = checked ? [...entry.evidenceTypes, type] : entry.evidenceTypes.filter((t) => t !== type);
    const details = { ...entry.evidenceDetails };
    if (checked && !details[type]) details[type] = { fileUrl: "", fileName: "", driveLink: "", notes: "" };
    onChange({ ...entry, evidenceTypes: types, evidenceDetails: details });
  }
  function setDetail(type: string, patch: Partial<IeaEntry["evidenceDetails"][string]>) {
    const current = entry.evidenceDetails[type] ?? { fileUrl: "", fileName: "", driveLink: "", notes: "" };
    const next = { ...entry, evidenceDetails: { ...entry.evidenceDetails, [type]: { ...current, ...patch } } };
    // The old portal mirrored the Drive link into evidenceLink; keep doing so for its reports.
    if (type.includes("Google Drive") && patch.driveLink !== undefined) next.evidenceLink = patch.driveLink;
    onChange(next);
  }

  return (
    <li className="rounded border bg-card">
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
          <span className="truncate text-[13px] font-semibold">{title}</span>
          {entry.evidenceTypes.length > 0 && <Badge variant="muted">{entry.evidenceTypes.length} evidence</Badge>}
        </button>
        {!disabled && (
          <Button variant="ghost" size="icon" className="text-destructive" aria-label={`Remove ${title}`} onClick={onRemove}>
            <Trash2 />
          </Button>
        )}
      </div>
      {open && (
        <fieldset disabled={disabled} className="flex flex-col gap-4 border-t p-3">
          <div className="grid gap-3 md:grid-cols-2">
            {section.fields.map((field) => (
              <Field key={field.k} label={field.l} className={field.t === "textarea" ? "md:col-span-1" : ""}>
                {field.t === "textarea" ? (
                  <Textarea rows={3} className="min-h-16" placeholder={field.ph} value={str(entry[field.k])} onChange={(e) => onChange({ ...entry, [field.k]: e.target.value })} />
                ) : (
                  <Input placeholder={field.ph} value={str(entry[field.k])} onChange={(e) => onChange({ ...entry, [field.k]: e.target.value })} />
                )}
              </Field>
            ))}
          </div>

          <div className="rounded border bg-muted/40 p-3">
            <p className="text-xs font-semibold text-foreground/80">Supporting evidence</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
              {IEA_EVIDENCE_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-1.5 text-[13px]">
                  <input type="checkbox" className="size-3.5 accent-[var(--primary)]" checked={entry.evidenceTypes.includes(type)} onChange={(e) => toggleType(type, e.target.checked)} />
                  {type}
                </label>
              ))}
            </div>
            {entry.evidenceTypes.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2">
                {entry.evidenceTypes.map((type) => {
                  const detail = entry.evidenceDetails[type] ?? { fileUrl: "", fileName: "", driveLink: "", notes: "" };
                  return (
                    <li key={type} className="grid gap-2 rounded border bg-card p-2.5 lg:grid-cols-[14rem_1fr_1fr_auto] lg:items-center">
                      <span className="text-[13px] font-medium">{type}</span>
                      <Input aria-label={`Link for ${type}`} placeholder="Drive / web link" value={detail.driveLink} onChange={(e) => setDetail(type, { driveLink: e.target.value })} />
                      <Input aria-label={`Notes for ${type}`} placeholder="Notes (if pending)" value={detail.notes} onChange={(e) => setDetail(type, { notes: e.target.value })} />
                      {detail.fileUrl ? (
                        <span className="flex items-center gap-1 text-[13px]">
                          <a href={detail.fileUrl} target="_blank" rel="noopener noreferrer" className="max-w-40 truncate text-primary underline underline-offset-2">
                            {detail.fileName || "File"}
                          </a>
                          {!disabled && (
                            <button type="button" aria-label="Remove file" className="rounded p-1 text-muted-foreground hover:text-destructive" onClick={() => setDetail(type, { fileUrl: "", fileName: "" })}>
                              <X className="size-3.5" />
                            </button>
                          )}
                        </span>
                      ) : (
                        <UploadButton disabled={disabled} folder="iea" label="Upload" onUploaded={(url, name) => setDetail(type, { fileUrl: url, fileName: name })} />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <Field label="Evidence missing / remarks" className="mt-3">
              <Input placeholder="e.g. BoS approval expected Aug 2026" value={entry.evidenceMissing} onChange={(e) => onChange({ ...entry, evidenceMissing: e.target.value })} />
            </Field>
          </div>
        </fieldset>
      )}
    </li>
  );
}

function FeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rating, setRating] = useState(0);
  const [like, setLike] = useState("");
  const [comments, setComments] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submitted. How was this form?</DialogTitle>
          <DialogDescription>Optional. Your feedback helps the Office of Academics improve the portal.</DialogDescription>
        </DialogHeader>
        <div>
          <p className="text-xs font-semibold text-foreground/80">Rating (1 = poor, 10 = excellent)</p>
          <div className="mt-1.5 flex flex-wrap gap-1" role="radiogroup" aria-label="Rating">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rating === n} onClick={() => setRating(n)}
                className={cn("size-8 rounded border text-[13px] font-medium", rating === n ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <Field label="What did you like?">
          <Textarea rows={2} className="min-h-10" value={like} onChange={(e) => setLike(e.target.value)} />
        </Field>
        <Field label="Comments or suggestions">
          <Textarea rows={2} className="min-h-10" value={comments} onChange={(e) => setComments(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Skip</Button>
          <Button disabled={pending} onClick={() => startTransition(async () => {
            const result = await sendIeaFeedback({ like, rating, comments });
            if (!result.ok) return void toast.error(result.error);
            toast.success("Thank you for the feedback.");
            onClose();
          })}>
            {pending && <Loader2 className="animate-spin" />}
            Send feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function IeaEditor({
  unit,
  submission,
  canWrite,
}: {
  unit: { school: string; department: string; level: string };
  submission: IeaSubmission | null;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [years, setYears] = useState<IeaYears>(() => submission?.years ?? emptyYears());
  const [year, setYear] = useState(submission?.acYear && IEA_YEARS.includes(submission.acYear) ? submission.acYear : IEA_YEARS[IEA_YEARS.length - 2]);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [pending, startTransition] = useTransition();

  const counts = useMemo(
    () => Object.fromEntries(IEA_YEARS.map((y) => [y, IEA_SECTIONS.reduce((n, s) => n + years[y][s.key].filter((e) => isFilled(e, s)).length, 0)])),
    [years],
  );
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  function setEntries(sectionKey: string, update: (list: IeaEntry[]) => IeaEntry[]) {
    setYears((prev) => ({ ...prev, [year]: { ...prev[year], [sectionKey]: update(prev[year][sectionKey]) } }));
    setDirty(true);
  }

  const payload = () => ({ ...unit, acYear: year, years });

  function save() {
    startTransition(async () => {
      const result = await saveIea(payload());
      if (!result.ok) return void toast.error(result.error);
      setDirty(false);
      toast.success("Progress saved.");
      router.refresh();
    });
  }

  function submit() {
    if (total === 0) return void toast.error("Add at least one entry before submitting.");
    const again = submission?.submitted ? ` This creates version ${submission.version + 1}; earlier versions are kept.` : "";
    if (!window.confirm(`Submit ${total} entr${total === 1 ? "y" : "ies"} for ${unit.department} (${unit.level})?${again}`)) return;
    startTransition(async () => {
      const result = await submitIea(payload());
      if (!result.ok) return void toast.error(result.error);
      setDirty(false);
      toast.success(`Submitted (version ${result.version}).`);
      setFeedback(true);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/iea" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" />
            All IEA submissions
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-primary">{unit.department}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
            {unit.school} · {unit.level}
            {submission?.submitted ? <Badge variant="success">Submitted · v{submission.version}</Badge> : <Badge variant={submission ? "warning" : "muted"}>{submission ? "Draft" : "Not saved yet"}</Badge>}
            {dirty && <Badge variant="warning">Unsaved changes</Badge>}
          </p>
        </div>
      </div>

      {!canWrite && <Notice tone="danger" title="Read-only">The deadline has passed or the module is closed. Request late access from the IEA page to make changes.</Notice>}

      <div className="flex overflow-x-auto rounded-md border bg-card" role="tablist" aria-label="Academic year">
        {IEA_YEARS.map((y) => (
          <button key={y} type="button" role="tab" aria-selected={y === year} onClick={() => setYear(y)}
            className={cn("flex flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-[3px] border-r px-4 py-2.5 text-[13px] font-medium last:border-r-0",
              y === year ? "border-b-accent bg-secondary text-primary" : "border-b-transparent text-muted-foreground hover:bg-muted")}>
            {y}
            <span className={cn("rounded-sm px-1.5 text-[11px] font-semibold leading-5", counts[y] ? "bg-success-soft text-success" : "bg-muted text-muted-foreground")}>{counts[y]}</span>
          </button>
        ))}
      </div>

      {IEA_SECTIONS.map((section) => {
        const entries = years[year][section.key];
        return (
          <Card key={section.key} style={{ borderLeftColor: section.color }} className="border-l-4">
            <CardHeader className="flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>Section {section.key}: {section.title}</CardTitle>
                <CardDescription>{section.sub}</CardDescription>
              </div>
              <Badge variant={entries.length ? "default" : "muted"}>{entries.length} {entries.length === 1 ? "entry" : "entries"}</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {entries.length === 0 && <p className="text-[13px] text-muted-foreground">No entries for {year}. Leave empty if not applicable.</p>}
              <ul className="flex flex-col gap-2">
                {entries.map((entry, index) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    index={index}
                    section={section}
                    disabled={!canWrite}
                    onChange={(next) => setEntries(section.key, (list) => list.map((e) => (e.id === entry.id ? next : e)))}
                    onRemove={() => {
                      if (isFilled(entry, section) && !window.confirm("Remove this entry?")) return;
                      setEntries(section.key, (list) => list.filter((e) => e.id !== entry.id));
                    }}
                  />
                ))}
              </ul>
              {canWrite && (
                <div>
                  <Button variant="secondary" size="sm" onClick={() => setEntries(section.key, (list) => [...list, newEntry(section)])}>
                    <Plus />
                    Add entry
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {submission && submission.versions.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Version history</CardTitle></CardHeader>
          <ul className="divide-y text-[13px]">
            {[...submission.versions].reverse().map((v) => (
              <li key={v.version} className="flex flex-wrap items-center gap-x-4 px-4 py-2">
                <span className="font-semibold">Version {v.version}</span>
                {v.current && <Badge variant="success">Current</Badge>}
                <span className="text-muted-foreground">{formatDateTime(v.at)}</span>
                <span className="text-muted-foreground">{v.entries} {v.entries === 1 ? "entry" : "entries"}</span>
                <span className="text-muted-foreground">{v.by}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {canWrite && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card lg:left-60">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-3 py-2.5 sm:px-5">
            <p className="text-[13px] text-muted-foreground">
              <span className="font-semibold text-foreground">{total}</span> entr{total === 1 ? "y" : "ies"} across all years · {counts[year]} in {year}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={save} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <Save />}
                Save progress
              </Button>
              <Button variant="accent" onClick={submit} disabled={pending}>
                <Send />
                {submission?.submitted ? "Submit new version" : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}
      <FeedbackDialog open={feedback} onClose={() => setFeedback(false)} />
    </div>
  );
}

/** Read-only view of every entry in a submission. */
export function IeaReadOnly({ submission }: { submission: IeaSubmission }) {
  return (
    <div className="flex flex-col gap-4">
      {IEA_YEARS.filter((y) => submission.yearCounts[y] > 0).map((year) => (
        <Card key={year}>
          <CardHeader><CardTitle>{year} · {submission.yearCounts[year]} entries</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            {IEA_SECTIONS.filter((s) => submission.years[year][s.key].length > 0).map((section) => (
              <section key={section.key}>
                <h3 className="rounded-sm border-l-[3px] bg-secondary px-3 py-1.5 text-[13px] font-semibold text-primary" style={{ borderLeftColor: section.color }}>
                  Section {section.key}: {section.title}
                </h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {submission.years[year][section.key].map((entry) => (
                    <li key={entry.id} className="rounded border p-3">
                      <dl className="grid gap-x-6 gap-y-2 md:grid-cols-2">
                        {section.fields.filter((f) => str(entry[f.k]).trim()).map((f) => (
                          <div key={f.k}>
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{f.l}</dt>
                            <dd className="whitespace-pre-wrap text-[13px]">{str(entry[f.k])}</dd>
                          </div>
                        ))}
                      </dl>
                      {(entry.evidenceTypes.length > 0 || entry.evidenceMissing) && (
                        <div className="mt-2 border-t pt-2 text-[13px]">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Evidence</p>
                          <ul className="mt-1 flex flex-col gap-0.5">
                            {entry.evidenceTypes.map((type) => {
                              const d = entry.evidenceDetails[type];
                              return (
                                <li key={type} className="flex flex-wrap gap-x-3">
                                  <span className="font-medium">{type}</span>
                                  {d?.driveLink && <a href={d.driveLink} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Link</a>}
                                  {d?.fileUrl && <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{d.fileName || "File"}</a>}
                                  {d?.notes && <span className="text-muted-foreground">{d.notes}</span>}
                                </li>
                              );
                            })}
                          </ul>
                          {entry.evidenceMissing && <p className="mt-1 text-muted-foreground">Remarks: {entry.evidenceMissing}</p>}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </CardContent>
        </Card>
      ))}
      {submission.totalEntries === 0 && <p className="rounded border border-dashed bg-card p-8 text-center text-[13px] text-muted-foreground">This submission has no entries.</p>}
    </div>
  );
}
