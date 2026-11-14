import type { Metadata } from "next";
import { requireDepartmentUser } from "@/lib/auth";
import { listAllIea, listIeaFeedback, recentIea } from "@/lib/iea";
import { IEA_SCHOOLS, IEA_SECTIONS, IEA_YEARS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyRow, PageHeader, Stat } from "@/components/ui/page";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "IEA Analysis" };

function Bars({ rows }: { rows: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li key={row.label} className="grid grid-cols-[minmax(0,13rem)_1fr_2.5rem] items-center gap-3 text-[13px]">
          <span className="truncate" title={row.label}>{row.label}</span>
          <span className="h-4 rounded-sm bg-muted">
            <span className="block h-4 rounded-sm" style={{ width: `${(row.value / max) * 100}%`, background: row.color ?? "var(--primary)" }} />
          </span>
          <span className="text-right font-semibold tabular-nums">{row.value}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function IeaAnalysisPage() {
  const user = await requireDepartmentUser();
  const [submissions, feedback] = await Promise.all([listAllIea(), user.isAdmin ? listIeaFeedback() : Promise.resolve([])]);

  const totalUnits = Object.values(IEA_SCHOOLS).reduce((n, depts) => n + Object.values(depts).reduce((m, levels) => m + levels.length, 0), 0);
  const submitted = submissions.filter((s) => s.submitted);
  const totalEntries = submissions.reduce((n, s) => n + s.totalEntries, 0);
  const unitsCovered = new Set(submitted.map((s) => `${s.school}|${s.department}|${s.level}`)).size;

  const bySection = IEA_SECTIONS.map((section) => ({
    label: `${section.key}. ${section.title}`,
    color: section.color,
    value: submissions.reduce((n, s) => n + IEA_YEARS.reduce((m, y) => m + s.years[y][section.key].length, 0), 0),
  }));
  const byYear = IEA_YEARS.map((year) => ({ label: year, value: submissions.reduce((n, s) => n + s.yearCounts[year], 0) }));
  const bySchool = Object.keys(IEA_SCHOOLS).map((school) => {
    const own = submissions.filter((s) => s.school === school);
    const units = Object.values(IEA_SCHOOLS[school]).reduce((n, levels) => n + levels.length, 0);
    return {
      school, units,
      covered: new Set(own.filter((s) => s.submitted).map((s) => `${s.department}|${s.level}`)).size,
      drafts: own.filter((s) => !s.submitted).length,
      entries: own.reduce((n, s) => n + s.totalEntries, 0),
    };
  });

  const recent = recentIea(submissions);

  return (
    <>
      <PageHeader title="IEA Analysis" description="University-wide picture of Innovation & Emerging Areas submissions." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Units submitted" value={`${unitsCovered} / ${totalUnits}`} tone="success" hint="School · department · level" />
        <Stat label="Submissions" value={submitted.length} hint={`${submissions.length - submitted.length} more in draft`} />
        <Stat label="Total entries" value={totalEntries} />
        <Stat label="Active in last 48 hours" value={recent.length} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Entries by section</CardTitle></CardHeader>
          <CardContent><Bars rows={bySection} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Entries by academic year</CardTitle></CardHeader>
          <CardContent><Bars rows={byYear} /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coverage by school</CardTitle>
          <CardDescription>A unit counts as covered once at least one person has submitted for it.</CardDescription>
        </CardHeader>
        <Table>
          <THead><tr><TH>School</TH><TH className="text-right">Units</TH><TH className="text-right">Covered</TH><TH>Coverage</TH><TH className="text-right">Drafts</TH><TH className="text-right">Entries</TH></tr></THead>
          <TBody>
            {bySchool.map((row) => {
              const pct = Math.round((row.covered / row.units) * 100);
              return (
                <TR key={row.school}>
                  <TD className="font-medium">{row.school}</TD>
                  <TD className="text-right tabular-nums">{row.units}</TD>
                  <TD className="text-right tabular-nums">{row.covered}</TD>
                  <TD>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-28 rounded-sm bg-muted"><span className="block h-2 rounded-sm bg-success" style={{ width: `${pct}%` }} /></span>
                      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
                    </span>
                  </TD>
                  <TD className="text-right tabular-nums">{row.drafts}</TD>
                  <TD className="text-right font-semibold tabular-nums">{row.entries}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent activity (last 48 hours)</CardTitle></CardHeader>
        <Table>
          <THead><tr><TH>Department</TH><TH>Level</TH><TH>By</TH><TH>Status</TH><TH className="text-right">Entries</TH><TH>When</TH></tr></THead>
          <TBody>
            {recent.map((s) => (
              <TR key={s._id}>
                <TD className="font-medium">{s.department}<span className="block text-xs font-normal text-muted-foreground">{s.school}</span></TD>
                <TD>{s.level}</TD>
                <TD>{s.submitterName || s.submitterEmail || "Not recorded"}</TD>
                <TD>{s.submitted ? <Badge variant="success">Submitted v{s.version}</Badge> : <Badge variant="warning">Draft saved</Badge>}</TD>
                <TD className="text-right tabular-nums">{s.totalEntries}</TD>
                <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(s.lastUpdated)}</TD>
              </TR>
            ))}
            {recent.length === 0 && <EmptyRow colSpan={6}>No IEA activity in the last 48 hours.</EmptyRow>}
          </TBody>
        </Table>
      </Card>

      {user.isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Form feedback ({feedback.length})</CardTitle>
            <CardDescription>
              Visible to admins only.
              {feedback.some((f) => f.rating) && ` Average rating ${(feedback.reduce((n, f) => n + f.rating, 0) / feedback.filter((f) => f.rating).length).toFixed(1)} / 10.`}
            </CardDescription>
          </CardHeader>
          <Table>
            <THead><tr><TH>From</TH><TH className="text-right">Rating</TH><TH>Liked</TH><TH>Comments</TH><TH>When</TH></tr></THead>
            <TBody>
              {feedback.map((f) => (
                <TR key={f._id}>
                  <TD>{f.submitterName || f.submitterEmail || "—"}</TD>
                  <TD className="text-right tabular-nums">{f.rating || "—"}</TD>
                  <TD className="max-w-xs">{f.like || "—"}</TD>
                  <TD className="max-w-md">{f.comments || "—"}</TD>
                  <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(f.createdAt)}</TD>
                </TR>
              ))}
              {feedback.length === 0 && <EmptyRow colSpan={5}>No feedback yet.</EmptyRow>}
            </TBody>
          </Table>
        </Card>
      )}
    </>
  );
}
