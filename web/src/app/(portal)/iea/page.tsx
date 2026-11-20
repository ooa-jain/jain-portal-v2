import type { Metadata } from "next";
import { requireModuleAccess } from "@/lib/access";
import { listMyIea } from "@/lib/iea";
import { IEA_DEFINITION, MODULES } from "@/lib/constants";
import { DeadlineBanner } from "@/components/deadline-banner";
import { IeaTable, NewIeaDialog } from "@/components/iea-list";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, Stat } from "@/components/ui/page";

export const metadata: Metadata = { title: MODULES.iea.label };

export default async function IeaPage() {
  const { user, access } = await requireModuleAccess("iea");
  const submissions = await listMyIea(user.email);
  const submitted = submissions.filter((s) => s.submitted).length;

  return (
    <>
      <PageHeader title={MODULES.iea.label} description={MODULES.iea.description} actions={access.canWrite && <NewIeaDialog />} />
      <DeadlineBanner access={access} isAdmin={user.isAdmin} />
      <details className="rounded-md border bg-card px-4 py-3 text-[13px]">
        <summary className="cursor-pointer font-semibold text-primary">What counts as an Innovation and Emerging Area?</summary>
        <p className="mt-2 max-w-4xl text-muted-foreground">{IEA_DEFINITION}</p>
      </details>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Units started" value={submissions.length} />
        <Stat label="Submitted" value={submitted} tone="success" />
        <Stat label="Drafts" value={submissions.length - submitted} tone="warning" />
        <Stat label="Total entries" value={submissions.reduce((n, s) => n + s.totalEntries, 0)} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>My IEA submissions</CardTitle>
          <CardDescription>One per school, department and programme level. Entry counts are shown per academic year.</CardDescription>
        </CardHeader>
        <IeaTable submissions={submissions} canWrite={access.canWrite} emptyText='No IEA submissions yet. Use "New submission" to choose a school, department and level.' />
      </Card>
    </>
  );
}
