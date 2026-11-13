import type { Metadata } from "next";
import { listAccessRequests, listAllSubmissions } from "@/lib/data";
import { PageHeader } from "@/components/ui/page";
import { RequestsAdmin } from "../admin-client";

export const metadata: Metadata = { title: "Requests" };

export default async function AdminRequestsPage() {
  const [access, submissions] = await Promise.all([listAccessRequests(), listAllSubmissions()]);
  return (
    <>
      <PageHeader title="Requests" description="Late-submission access after a deadline, and approvals to edit a submission beyond the free edit limit." />
      <RequestsAdmin access={access} edits={submissions.filter((s) => s.edit_request)} />
    </>
  );
}
