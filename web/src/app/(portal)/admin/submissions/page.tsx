import type { Metadata } from "next";
import { Download } from "lucide-react";
import { listAllSubmissions } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import { SubmissionsAdmin } from "../admin-client";

export const metadata: Metadata = { title: "All submissions" };

export default async function AdminSubmissionsPage() {
  const submissions = await listAllSubmissions();
  return (
    <>
      <PageHeader
        title="Readiness and closure submissions"
        description="Every department's submissions. Open one to read it, review faculty responses or edit it."
        actions={
          <>
            <Button variant="outline" asChild><a href="/api/admin/export-all?type=readiness" download><Download />Readiness</a></Button>
            <Button variant="outline" asChild><a href="/api/admin/export-all?type=closure" download><Download />Closure</a></Button>
            <Button asChild><a href="/api/admin/export-all" download><Download />Export all</a></Button>
          </>
        }
      />
      <SubmissionsAdmin submissions={submissions} />
    </>
  );
}
