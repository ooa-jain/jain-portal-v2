import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireFormModule } from "@/lib/access";
import { listMySubmissions } from "@/lib/data";
import { MODULES, isFormModuleKey } from "@/lib/constants";
import { DeadlineBanner } from "@/components/deadline-banner";
import { SubmissionTable } from "@/components/submission-list";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, Stat } from "@/components/ui/page";

export async function generateMetadata({ params }: PageProps<"/[module]">): Promise<Metadata> {
  const { module } = await params;
  return { title: isFormModuleKey(module) ? MODULES[module].label : "Not found" };
}

export default async function ModulePage({ params }: PageProps<"/[module]">) {
  const { module: segment } = await params;
  const { module, user, access } = await requireFormModule(segment);
  const meta = MODULES[module];
  const submissions = await listMySubmissions(user, module);
  const final = submissions.filter((s) => !s._draft).length;
  const faculty = submissions.reduce((sum, s) => sum + (s.faculty_submission_count ?? 0), 0);

  return (
    <>
      <PageHeader
        title={meta.label}
        description={meta.description}
        actions={
          access.canWrite && (
            <Button asChild>
              <Link href={`/${module}/form`}>
                <Plus />
                New submission
              </Link>
            </Button>
          )
        }
      />
      <DeadlineBanner access={access} isAdmin={user.isAdmin} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Submissions" value={submissions.length} />
        <Stat label="Submitted" value={final} tone="success" />
        <Stat label="Drafts" value={submissions.length - final} tone="warning" />
        <Stat label="Faculty responses" value={faculty} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{meta.short} submissions</CardTitle>
          <CardDescription>Yours, and those from your department.</CardDescription>
        </CardHeader>
        <SubmissionTable
          submissions={submissions}
          currentEmail={user.email}
          isAdmin={user.isAdmin}
          canWrite={access.canWrite}
          emptyText={`No ${meta.short.toLowerCase()} submissions yet. Use "New submission" to start one; you can save a draft and return later.`}
        />
      </Card>
    </>
  );
}
