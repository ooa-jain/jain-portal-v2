import Link from "next/link";
import { ArrowRight, ClipboardCheck, FileCheck2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getSettings, listMySubmissions } from "@/lib/data";
import { moduleOpenFor } from "@/lib/access";
import { MODULES, MODULE_KEYS } from "@/lib/constants";
import { DepartmentForm } from "@/components/department-form";
import { SubmissionList } from "@/components/submission-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

const ICONS = { readiness: ClipboardCheck, closure: FileCheck2 };

export default async function DashboardPage() {
  const [user, settings] = await Promise.all([requireUser(), getSettings()]);
  const submissions = await listMySubmissions(user);
  // Skip a leading title such as "Dr." so the greeting uses the actual name.
  const firstName = user.name.replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, "").split(" ")[0] || user.name;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {firstName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user.department || "Choose your department to get started."}
        </p>
      </div>

      {!user.department && (
        <Card className="border-accent bg-accent-soft">
          <CardHeader>
            <CardTitle>Which department are you in?</CardTitle>
            <CardDescription className="text-foreground/70">
              It pre-fills your forms and shows you submissions from your department.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DepartmentForm current="" />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {MODULE_KEYS.map((key) => {
          const meta = MODULES[key];
          const Icon = ICONS[key];
          const open = moduleOpenFor(user, settings, key);
          const mine = submissions.filter((s) => s.form_type === key);
          const latest = mine[0];
          return (
            <Card key={key} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-11 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Icon className="size-5" />
                  </span>
                  {!open ? (
                    <Badge variant="muted">Closed</Badge>
                  ) : latest ? (
                    <Badge variant={latest._draft ? "warning" : "success"}>
                      {latest._draft ? "Draft in progress" : `Submitted ${formatDate(latest.timestamp)}`}
                    </Badge>
                  ) : (
                    <Badge variant="muted">Not started</Badge>
                  )}
                </div>
                <CardTitle className="mt-3 text-lg">{meta.label}</CardTitle>
                <CardDescription>{meta.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex flex-wrap gap-2">
                {open ? (
                  <>
                    <Button asChild>
                      <Link href={latest ? `/${key}/form/${latest._id}` : `/${key}/form`}>
                        {latest ? (latest._draft ? "Continue draft" : "Open latest") : "Start"}
                        <ArrowRight />
                      </Link>
                    </Button>
                    {mine.length > 0 && (
                      <Button variant="outline" asChild>
                        <Link href={`/${key}`}>All submissions ({mine.length})</Link>
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This module is not open right now. The Office of Academics will announce when it opens.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {submissions.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Recent submissions</h2>
          <SubmissionList submissions={submissions.slice(0, 5)} currentEmail={user.email} isAdmin={user.isAdmin} showModule />
        </section>
      )}

      {user.department && (
        <section className="flex flex-col gap-3 border-t pt-6">
          <h2 className="text-sm font-semibold">Your department</h2>
          <DepartmentForm current={user.department} />
        </section>
      )}
    </div>
  );
}
