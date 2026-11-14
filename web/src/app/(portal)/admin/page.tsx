import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { collections } from "@/lib/db";
import { getSettings, listAllSubmissions } from "@/lib/data";
import { listAllIea } from "@/lib/iea";
import { DEPARTMENTS, FORM_MODULE_KEYS, MODULES, MODULE_KEYS, type FormModuleKey } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, Stat } from "@/components/ui/page";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { Submission } from "@/lib/types";
import { formatDate, formatDeadline, isDeadlinePassed } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminOverviewPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [settings, submissions, iea, userCount, activeToday, accessPending, pwa] = await Promise.all([
    getSettings(),
    listAllSubmissions(),
    listAllIea(),
    collections.users().countDocuments(),
    collections.users().countDocuments({ last_login: { $regex: `^${today}` } }),
    collections.accessRequests().countDocuments({ status: "pending" }),
    collections.pwaAnalytics().findOne({ _id: "pwa_stats" }),
  ]);
  const final = submissions.filter((s) => !s._draft);
  const editPending = submissions.filter((s) => s.edit_request?.status === "pending").length;

  // Latest submission per department and module (list is newest first); a final one beats a newer draft.
  const coverage = new Map<string, Partial<Record<FormModuleKey, Submission>>>();
  for (const sub of submissions) {
    if (!sub.identity.dept) continue;
    const row = coverage.get(sub.identity.dept) ?? {};
    const existing = row[sub.form_type];
    if (!existing || (existing._draft && !sub._draft)) row[sub.form_type] = sub;
    coverage.set(sub.identity.dept, row);
  }
  const departments = [...new Set([...DEPARTMENTS, ...coverage.keys()])];
  const covered = (key: FormModuleKey) => departments.filter((d) => coverage.get(d)?.[key] && !coverage.get(d)![key]!._draft).length;

  return (
    <>
      <PageHeader
        title="Administration overview"
        description="Submission status across the university."
        actions={
          <Button variant="outline" asChild>
            <a href="/api/admin/export-all" download><Download />Export readiness and closure (Excel)</a>
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Readiness" value={final.filter((s) => s.form_type === "readiness").length} tone="success" hint="Submitted" />
        <Stat label="Closure" value={final.filter((s) => s.form_type === "closure").length} tone="success" hint="Submitted" />
        <Stat label="IEA" value={iea.filter((s) => s.submitted).length} tone="success" hint="Submitted" />
        <Stat label="Drafts" value={submissions.length - final.length + iea.filter((s) => !s.submitted).length} tone="warning" hint="All modules" />
        <Stat label="Faculty responses" value={submissions.reduce((n, s) => n + (s.faculty_submission_count ?? 0), 0)} />
        <Stat label="Users" value={userCount} hint={`${activeToday} signed in today`} />
        <Stat label="Open requests" value={accessPending + editPending} tone={accessPending + editPending ? "danger" : "default"} hint={<Link href="/admin/requests" className="underline">Review</Link>} />
        <Stat label="App installs" value={Number(pwa?.installs) || 0} hint={`${Number(pwa?.launches) || 0} launches`} />
      </div>

      <Card>
        <CardHeader><CardTitle>Module windows</CardTitle></CardHeader>
        <Table>
          <THead><tr><TH>Module</TH><TH>State</TH><TH>Deadline (IST)</TH><TH>Departments submitted</TH></tr></THead>
          <TBody>
            {MODULE_KEYS.map((key) => {
              const meta = MODULES[key];
              const deadline = settings[meta.deadlineKey];
              return (
                <TR key={key}>
                  <TD className="font-semibold text-primary">{meta.label}</TD>
                  <TD>
                    {!settings[meta.enabledKey] ? <Badge variant="muted">Switched off</Badge>
                      : isDeadlinePassed(deadline) ? <Badge variant="destructive">Deadline passed</Badge>
                      : <Badge variant="success">Open</Badge>}
                  </TD>
                  <TD>{deadline ? formatDeadline(deadline) : "No deadline"}</TD>
                  <TD className="tabular-nums">
                    {key === "iea"
                      ? `${new Set(iea.filter((s) => s.submitted).map((s) => s.department)).size} (IEA departments)`
                      : `${covered(key)} of ${departments.length}`}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Department status</CardTitle>
          <CardDescription>Latest readiness and closure submission from each department.</CardDescription>
        </CardHeader>
        <Table>
          <THead><tr><TH>Department</TH>{FORM_MODULE_KEYS.map((k) => <TH key={k}>{MODULES[k].label}</TH>)}</tr></THead>
          <TBody>
            {departments.map((dept) => (
              <TR key={dept}>
                <TD className="font-medium">{dept}</TD>
                {FORM_MODULE_KEYS.map((key) => {
                  const sub = coverage.get(dept)?.[key];
                  return (
                    <TD key={key}>
                      {sub ? (
                        <Link href={`/${key}/form/${sub._id}`} className="inline-flex items-center gap-2 hover:underline">
                          <Badge variant={sub._draft ? "warning" : "success"}>{sub._draft ? "Draft" : "Submitted"}</Badge>
                          <span className="text-xs text-muted-foreground">{sub.identity.semester} · {formatDate(sub.timestamp)}</span>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not started</span>
                      )}
                    </TD>
                  );
                })}
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </>
  );
}
