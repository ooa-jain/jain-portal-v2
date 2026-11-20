import Link from "next/link";
import { ArrowRight, Check, FileText } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getSettings, listMySubmissions } from "@/lib/data";
import { allModuleAccess } from "@/lib/access";
import { listDocuments, scopeFilter } from "@/lib/documents";
import { DOC_TYPES, LISTED_MODULE_KEYS, MODULES } from "@/lib/constants";
import { FacultyHome } from "@/components/faculty-home";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/page";
import { formatDateTime, formatDeadline, parseDeadline } from "@/lib/utils";

const DOC_LABEL = new Map(DOC_TYPES.map((t) => [t.key, t.label]));
const REVIEW_LABEL: Record<string, { text: string; variant: "success" | "warning" | "destructive" | "muted" }> = {
  approved: { text: "Approved", variant: "success" },
  pending: { text: "With HOD", variant: "warning" },
  returned: { text: "Returned", variant: "destructive" },
  not_sent: { text: "Needs re-upload", variant: "destructive" },
};

/** "Odd 2026-27" already names the year; add the academic year only when it does not. */
function semesterLabel(semester: string, acYear: string) {
  if (!semester) return acYear;
  return acYear && !semester.includes(acYear) ? `${semester} ${acYear}` : semester;
}

/** Home: where you left off, your readiness and closure submissions, and the latest uploads. */
export default async function DashboardPage() {
  const user = await requireUser();
  if (user.isFaculty) return <FacultyHome user={user} />;

  const [access, submissions, settings, docs] = await Promise.all([
    allModuleAccess(user),
    listMySubmissions(user),
    getSettings(),
    listDocuments(scopeFilter(user, user.department || undefined)),
  ]);

  const cycle = [...settings.enabled_years].sort().pop()?.replace("-", "–") ?? "";
  // "Dr. Meera Nair" -> "Meera": skip a title before the first name.
  const nameParts = user.name.split(/\s+/).filter(Boolean);
  const firstName = nameParts.find((part) => !/^(dr|prof|mr|mrs|ms|miss|shri|smt)\.?$/i.test(part)) ?? user.name;
  const latest = submissions[0];
  const latestAccess = latest ? access[latest.form_type] : null;
  const submittedModules = LISTED_MODULE_KEYS.filter((key) => submissions.some((s) => s.form_type === key && !s._draft));
  const upcoming = LISTED_MODULE_KEYS.filter((k) => access[k].open && access[k].deadline && !access[k].deadlinePassed)
    .map((k) => ({ key: k, at: parseDeadline(access[k].deadline)! }))
    .sort((a, b) => a.at.getTime() - b.at.getTime())[0];
  const recentUploads = [...docs].sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at)).slice(0, 6);
  const progress = LISTED_MODULE_KEYS.length ? (submittedModules.length / LISTED_MODULE_KEYS.length) * 100 : 0;

  return (
    <>
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-primary">
          Welcome back, <span className="hl hl-on">{firstName}</span>
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          {[user.isAdmin ? "Office of Academic Affairs" : user.department, `Jain OOA Portal | ${cycle}`].filter(Boolean).join(" · ")}
        </p>
      </div>

      {!user.department && !user.isAdmin && (
        <Notice tone="warning" title="Your department is not set yet">
          The Office of Academic Affairs sets each account&apos;s department, so you only ever see your own
          department&apos;s submissions and documents. Please ask them to set yours.
        </Notice>
      )}

      {latest ? (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-hero px-6 py-6 text-hero-foreground shadow-[0_18px_40px_-24px_rgba(15,36,64,.6)] dark:border dark:border-border">
          <div className="min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/70">Continue where you left off</p>
            <h2 className="mt-2 text-[22px] font-bold leading-tight sm:text-[26px]">
              {MODULES[latest.form_type].label}
              {latest.identity.dept ? ` · ${latest.identity.dept}` : ""}
              {semesterLabel(latest.identity.semester, latest.identity.acYear) ? ` · ${semesterLabel(latest.identity.semester, latest.identity.acYear)}` : ""}
            </h2>
            <p className="mt-1.5 text-[13px] text-white/75">
              {latest._draft ? "Draft" : "Submitted"} · last saved {formatDateTime(latest.timestamp)}
              {latest.identity.submitterName ? ` by ${latest.identity.submitterName}` : ""}
            </p>
          </div>
          <Link
            href={`/${latest.form_type}/form/${latest._id}`}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-[15px] font-bold text-[#0f2440] shadow-sm transition hover:bg-white/90"
          >
            {latest._draft && latestAccess?.canWrite ? "Continue" : "Open"} <ArrowRight className="size-4" />
          </Link>
        </section>
      ) : (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-hero px-6 py-6 text-hero-foreground dark:border dark:border-border">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/70">Get started</p>
            <h2 className="mt-2 text-[22px] font-bold">Start your Semester Readiness checklist</h2>
            <p className="mt-1.5 text-[13px] text-white/75">Your drafts are saved as you go, and you can come back to them here.</p>
          </div>
          <Link
            href="/readiness/form"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-[15px] font-bold text-[#0f2440] shadow-sm transition hover:bg-white/90"
          >
            Start <ArrowRight className="size-4" />
          </Link>
        </section>
      )}

      <Card className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
        <span className="h-2 w-44 rounded-full bg-secondary">
          <span className="block h-2 rounded-full bg-[#2563eb]" style={{ width: `${progress}%` }} />
        </span>
        <span className="text-[14px] text-foreground">
          {submittedModules.length} of {LISTED_MODULE_KEYS.length} modules submitted
        </span>
        {upcoming && (
          <span className="text-[13px] text-muted-foreground">
            · Next deadline: <strong className="font-semibold text-destructive">{MODULES[upcoming.key].label}, {formatDeadline(access[upcoming.key].deadline)}</strong>
          </span>
        )}
        <Button variant="outline" size="sm" className="ml-auto" asChild>
          <Link href="/analytics">See analysis <ArrowRight /></Link>
        </Button>
      </Card>

      <Card>
        <div className="flex items-center justify-between border-b bg-accent-soft px-4 py-3">
          <h2 className="text-[15px] font-bold text-primary">Submissions</h2>
          <span className="text-[13px] text-muted-foreground">Semester Readiness and Semester Closure</span>
        </div>
        {submissions.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13.5px] text-muted-foreground">Nothing submitted yet.</p>
        ) : (
          <ul className="divide-y">
            {submissions.slice(0, 8).map((s) => (
              <li key={s._id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-primary">
                    {MODULES[s.form_type].label}
                    {s.identity.dept ? ` · ${s.identity.dept}` : ""}
                  </span>
                  <span className="block text-[12.5px] text-muted-foreground">
                    {semesterLabel(s.identity.semester, s.identity.acYear) || "No semester yet"} · {formatDateTime(s.timestamp)}
                    {s.identity.submitterName ? ` · ${s.identity.submitterName}` : ""}
                  </span>
                </span>
                {s._draft ? (
                  <Badge variant="warning">Draft</Badge>
                ) : (
                  <Badge variant="success"><Check className="size-3" /> Submitted</Badge>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/${s.form_type}/form/${s._id}`}>
                    {s._draft && access[s.form_type].canWrite && s.identity.submitterEmail === user.email ? "Continue" : "See submission"} <ArrowRight />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between border-b bg-accent-soft px-4 py-3">
          <h2 className="text-[15px] font-bold text-primary">Last uploaded files</h2>
          <Link href="/documents" className="text-[13px] font-semibold text-link hover:underline">
            Document Library →
          </Link>
        </div>
        {recentUploads.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13.5px] text-muted-foreground">No files uploaded yet.</p>
        ) : (
          <ul className="divide-y">
            {recentUploads.map((d) => {
              const review = REVIEW_LABEL[d.review.status] ?? REVIEW_LABEL.pending;
              return (
                <li key={d._id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <FileText className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-primary">
                      {d.course_code} · {DOC_LABEL.get(d.doc_type) ?? d.doc_type}
                    </span>
                    <span className="block truncate text-[12.5px] text-muted-foreground">
                      {d.file_name} · {d.semester} · {d.uploaded_by_name || d.uploaded_by_email}, {formatDateTime(d.uploaded_at)}
                    </span>
                  </span>
                  <Badge variant={review.variant}>{review.text}</Badge>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/api/documents/${d._id}/file`} target="_blank" rel="noreferrer">
                      Open <ArrowRight />
                    </a>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
