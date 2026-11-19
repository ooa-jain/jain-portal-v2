import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { FacultyChecklists } from "@/components/faculty-checklists";
import { PageHeader } from "@/components/ui/page";

export const metadata: Metadata = { title: "My Checklists" };

export default async function MyChecklistsPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="My Checklists" description="Checklists your HOD shared with your department: the ones still to fill, and the ones you have submitted." />
      <FacultyChecklists user={user} />
    </>
  );
}
