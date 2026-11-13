import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { toObjectId } from "@/lib/data";
import { listAllIea } from "@/lib/iea";
import { IeaReadOnly } from "@/components/iea-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "IEA submission" };

export default async function IeaViewPage({ params }: PageProps<"/iea/view/[id]">) {
  const user = await requireUser();
  const _id = toObjectId((await params).id);
  const submission = _id ? (await listAllIea({ _id }))[0] : null;
  // Owners and admins only.
  if (!submission || (!user.isAdmin && submission.submitterEmail !== user.email)) notFound();

  return (
    <>
      <Link href={user.isAdmin ? "/admin/iea" : "/iea"} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Back to IEA submissions
      </Link>
      <PageHeader
        title={submission.department}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {submission.school} · {submission.level} · {submission.submitterName || submission.submitterEmail} · Updated {formatDateTime(submission.lastUpdated)}
            {submission.submitted ? <Badge variant="success">Submitted v{submission.version}</Badge> : <Badge variant="warning">Draft</Badge>}
          </span>
        }
        actions={
          <Button variant="outline" asChild>
            <a href={`/api/iea/export?sid=${submission._id}`}><Download />Excel</a>
          </Button>
        }
      />
      <IeaReadOnly submission={submission} />
    </>
  );
}
