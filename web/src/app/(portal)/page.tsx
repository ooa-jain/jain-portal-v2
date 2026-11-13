import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listMySubmissions, listNotifications } from "@/lib/data";
import { allModuleAccess } from "@/lib/access";
import { listMyIea } from "@/lib/iea";
import { MODULES, MODULE_KEYS } from "@/lib/constants";
import { DepartmentForm } from "@/components/department-form";
import { SubmissionTable } from "@/components/submission-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice, PageHeader, Stat } from "@/components/ui/page";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime, formatDeadline, parseDeadline } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();
  const [access, submissions, iea, notifications] = await Promise.all([
    allModuleAccess(user),
    listMySubmissions(user),
    listMyIea(user.email),
    listNotifications(5),
  ]);

  const drafts = submissions.filter((s) => s._draft).length + iea.filter((s) => !s.submitted).length;
  const submitted = submissions.filter((s) => !s._draft).length + iea.filter((s) => s.submitted).length;
  const facultyTotal = submissions.reduce((sum, s) => sum + (s.faculty_submission_count ?? 0), 0);
  const upcoming = MODULE_KEYS.filter((k) => access[k].open && access[k].deadline && !access[k].deadlinePassed)
    .map((k) => ({ key: k, at: parseDeadline(access[k].deadline)! }))
    .sort((a, b) => a.at.getTime() - b.at.getTime())[0];

  const rows = MODULE_KEYS.map((key) => {
    const a = access[key];
    if (key === "iea") {
      const latest = [...iea].sort((x, y) => y.lastUpdated.localeCompare(x.lastUpdated))[0];
      return {
        key, a,
        status: latest ? (latest.submitted ? "Submitted" : "Draft") : "Not started",
        last: latest?.lastUpdated ?? "",
        href: "/iea",
        action: latest ? "Open" : "Start",
      };
    }
    const latest = submissions.find((s) => s.form_type === key);
    return {
      key, a,
      status: latest ? (latest._draft ? "Draft" : "Submitted") : "Not started",
      last: latest?.timestamp ?? "",
      href: latest ? `/${key}/form/${latest._id}` : a.canWrite ? `/${key}/form` : `/${key}`,
      action: latest ? (latest._draft && a.canWrite ? "Continue" : "Open") : "Start",
    };
  });

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${user.name}${user.department ? ` · ${user.department}` : ""}`}
      />

      {!user.department && (
        <Notice tone="warning" title="Select your department">
          <p className="mb-2">It pre-fills your forms and shows you submissions from your department.</p>
          <DepartmentForm current="" />
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Submitted" value={submitted} tone="success" hint="Across all modules" />
        <Stat label="Drafts in progress" value={drafts} tone="warning" hint={drafts ? "Finish and submit before the deadline" : "Nothing pending"} />
        <Stat label="Faculty responses" value={facultyTotal} hint="Received through your share links" />
        <Stat
          label="Next deadline"
          value={<span className="text-base">{upcoming ? formatDeadline(access[upcoming.key].deadline) : "None set"}</span>}
          tone={upcoming ? "danger" : "default"}
          hint={upcoming ? MODULES[upcoming.key].label : "No upcoming deadlines"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Modules</CardTitle>
            <CardDescription>Your status in each module for the current cycle.</CardDescription>
          </CardHeader>
          <Table>
            <THead>
              <tr>
                <TH>Module</TH><TH>Window</TH><TH>Deadline (IST)</TH><TH>Your status</TH><TH>Last activity</TH><TH className="text-right">Action</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map(({ key, a, status, last, href, action }) => (
                <TR key={key}>
                  <TD>
                    <span className="font-semibold text-primary">{MODULES[key].label}</span>
                    <span className="block max-w-md text-xs text-muted-foreground">{MODULES[key].description}</span>
                  </TD>
                  <TD>
                    {!a.open ? <Badge variant="muted">Closed</Badge>
                      : a.canWrite ? <Badge variant="success">{a.deadlinePassed ? "Late access" : "Open"}</Badge>
                      : <Badge variant="destructive">Deadline passed</Badge>}
                  </TD>
                  <TD className="whitespace-nowrap">{a.deadline ? formatDeadline(a.deadline) : "—"}</TD>
                  <TD>
                    <Badge variant={status === "Submitted" ? "success" : status === "Draft" ? "warning" : "muted"}>{status}</Badge>
                  </TD>
                  <TD className="whitespace-nowrap text-xs text-muted-foreground">{last ? formatDateTime(last) : "—"}</TD>
                  <TD className="text-right">
                    {a.open ? (
                      <Button size="sm" variant={status === "Submitted" ? "outline" : "default"} asChild>
                        <Link href={href}>{action}<ArrowRight /></Link>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not available</span>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
            <CardDescription>From the Office of Academics.</CardDescription>
          </CardHeader>
          {notifications.length === 0 ? (
            <CardContent className="text-[13px] text-muted-foreground">No announcements.</CardContent>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li key={n._id} className="px-4 py-2.5">
                  <p className="text-[13px] font-semibold">{n.title}</p>
                  <p className="text-[13px] text-muted-foreground">{n.body}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDateTime(n.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent readiness and closure submissions</CardTitle>
        </CardHeader>
        <SubmissionTable submissions={submissions.slice(0, 8)} currentEmail={user.email} isAdmin={user.isAdmin} showModule />
      </Card>

      {user.department && (
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-1.5 text-xs font-semibold text-foreground/80">Department</p>
            <DepartmentForm current={user.department} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
