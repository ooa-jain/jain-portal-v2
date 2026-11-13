"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteIea } from "@/app/actions/iea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, Select } from "@/components/ui/input";
import { EmptyRow } from "@/components/ui/page";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { IEA_SCHOOLS, IEA_YEARS } from "@/lib/constants";
import type { IeaSubmission } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export function ieaFormHref(s: { school: string; department: string; level: string }) {
  return `/iea/form?${new URLSearchParams({ school: s.school, dept: s.department, level: s.level })}`;
}

export function NewIeaDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [school, setSchool] = useState("");
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");
  const departments = school ? Object.keys(IEA_SCHOOLS[school]) : [];
  const levels = school && department ? IEA_SCHOOLS[school][department] : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus />New submission</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start or open an IEA submission</DialogTitle>
          <DialogDescription>Choose the unit you are reporting for. If you already started one for it, it opens where you left off.</DialogDescription>
        </DialogHeader>
        <Field label="School" required>
          <Select value={school} onChange={(e) => { setSchool(e.target.value); setDepartment(""); setLevel(""); }}>
            <option value="">Select school</option>
            {Object.keys(IEA_SCHOOLS).map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Department" required>
          <Select value={department} disabled={!school} onChange={(e) => { setDepartment(e.target.value); setLevel(""); }}>
            <option value="">Select department</option>
            {departments.map((d) => <option key={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label="Programme level" required>
          <Select value={level} disabled={!department} onChange={(e) => setLevel(e.target.value)}>
            <option value="">Select level</option>
            {levels.map((l) => <option key={l}>{l}</option>)}
          </Select>
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!level} onClick={() => router.push(ieaFormHref({ school, department, level }))}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function IeaTable({
  submissions,
  canWrite,
  showOwner = false,
  adminView = false,
  emptyText,
}: {
  submissions: IeaSubmission[];
  canWrite: boolean;
  showOwner?: boolean;
  /** Admin list: rows open the read-only view and can be deleted. */
  adminView?: boolean;
  emptyText: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(s: IeaSubmission) {
    if (!window.confirm(`Delete the IEA submission for ${s.department} (${s.level}) with ${s.totalEntries} entries? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteIea(s._id);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Submission deleted.");
      router.refresh();
    });
  }

  return (
    <Table>
      <THead>
        <tr>
          <TH>Department</TH><TH>Level</TH>
          {showOwner && <TH>Submitted by</TH>}
          {IEA_YEARS.map((y) => <TH key={y} className="text-right">{y.replace("AY ", "")}</TH>)}
          <TH className="text-right">Total</TH><TH>Status</TH><TH>Last updated</TH><TH className="text-right">Actions</TH>
        </tr>
      </THead>
      <TBody>
        {submissions.map((s) => {
          const href = adminView ? `/iea/view/${s._id}` : ieaFormHref(s);
          return (
            <TR key={s._id}>
              <TD>
                <Link href={href} className="font-semibold text-primary hover:underline">{s.department}</Link>
                <span className="block text-xs text-muted-foreground">{s.school}</span>
              </TD>
              <TD>{s.level}</TD>
              {showOwner && <TD>{s.submitterName || "—"}<span className="block text-xs text-muted-foreground">{s.submitterEmail}</span></TD>}
              {IEA_YEARS.map((y) => <TD key={y} className="text-right tabular-nums">{s.yearCounts[y] || <span className="text-muted-foreground">0</span>}</TD>)}
              <TD className="text-right font-semibold tabular-nums">{s.totalEntries}</TD>
              <TD>{s.submitted ? <Badge variant="success">Submitted v{s.version}</Badge> : <Badge variant="warning">Draft</Badge>}</TD>
              <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(s.lastUpdated)}</TD>
              <TD>
                <div className="flex justify-end gap-1">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={href}>{!adminView && canWrite ? <Pencil /> : <Eye />}{!adminView && canWrite ? "Open" : "View"}</Link>
                  </Button>
                  <Button variant="ghost" size="icon" asChild>
                    <a href={`/api/iea/export?sid=${s._id}`} aria-label="Download Excel" title="Download Excel"><Download /></a>
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" aria-label="Delete submission" title="Delete" disabled={pending} onClick={() => remove(s)}>
                    <Trash2 />
                  </Button>
                </div>
              </TD>
            </TR>
          );
        })}
        {submissions.length === 0 && <EmptyRow colSpan={(showOwner ? 12 : 11)}>{emptyText}</EmptyRow>}
      </TBody>
    </Table>
  );
}
