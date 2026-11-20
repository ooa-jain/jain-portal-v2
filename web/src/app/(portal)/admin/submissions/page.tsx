import type { Metadata } from "next";
import type { Document, Filter } from "mongodb";
import { Download } from "lucide-react";
import { listSubmissionsPage } from "@/lib/data";
import { CAMPUSES, FORM_MODULE_KEYS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import { SubmissionsAdmin } from "../admin-client";

export const metadata: Metadata = { title: "All submissions" };

const PAGE_SIZE = 100;
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Every department's submissions, searched and paged in the database (100 at a time). */
export default async function AdminSubmissionsPage({ searchParams }: PageProps<"/admin/submissions">) {
  const params = await searchParams;
  const one = (key: string) => (typeof params[key] === "string" ? String(params[key]) : "");
  const q = one("q").trim().slice(0, 100);
  const moduleKey = FORM_MODULE_KEYS.includes(one("module") as never) ? one("module") : "";
  const status = ["final", "draft"].includes(one("status")) ? one("status") : "";
  const campus = CAMPUSES.includes(one("campus")) ? one("campus") : "";
  const page = Math.max(1, Math.min(100000, Number(one("page")) || 1));

  const filter: Filter<Document> = { form_type: moduleKey || { $in: FORM_MODULE_KEYS } };
  if (status) filter._draft = status === "draft";
  if (campus) filter["identity.campus"] = campus;
  if (q) {
    const pattern = { $regex: escapeRegex(q), $options: "i" };
    filter.$or = ["dept", "hodName", "hodEmail", "semester", "submitterEmail"].map((f) => ({ [`identity.${f}`]: pattern }));
  }
  const { items, total } = await listSubmissionsPage(filter, page, PAGE_SIZE);

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
      <SubmissionsAdmin
        submissions={items}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        initial={{ q, module: moduleKey, status, campus }}
      />
    </>
  );
}
