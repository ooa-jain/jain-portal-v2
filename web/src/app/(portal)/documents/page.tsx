import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { knownCourses, listDocuments, scopeFilter } from "@/lib/documents";
import { DEPARTMENTS } from "@/lib/constants";
import { PageHeader } from "@/components/ui/page";
import { DocumentLibrary } from "@/components/document-library";

export const metadata: Metadata = { title: "Document Library" };

export default async function DocumentsPage({ searchParams }: PageProps<"/documents">) {
  const user = await requireUser();
  const params = await searchParams;
  const deptParam = typeof params.dept === "string" ? params.dept : "";
  const dept = user.isAdmin ? (DEPARTMENTS.includes(deptParam) ? deptParam : "") : user.department;

  const [settings, documents, courses] = await Promise.all([
    getSettings(),
    listDocuments(scopeFilter(user, dept || undefined)),
    knownCourses(dept),
  ]);
  const offered = [...settings.enabled_years].sort().reverse().flatMap((y) => settings.enabled_semesters.map((s) => `${s} ${y}`));
  // Semesters that already hold documents stay selectable even if no longer offered.
  const semesters = [...new Set([...offered, ...documents.map((d) => d.semester).filter(Boolean)])];
  // Open on the semester people are working in: the most recent upload's, else the newest offered.
  const latest = [...documents].sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))[0];
  const initialSemester = latest?.semester || offered[0] || "";

  return (
    <>
      <PageHeader
        title="Document Library"
        description="Every course document in one place, by programme, course and semester. Each upload is checked automatically, then reviewed by the HOD. One current copy of each document; earlier versions are kept."
      />
      <DocumentLibrary
        documents={documents}
        courses={courses}
        semesters={semesters}
        initialSemester={initialSemester}
        dept={dept}
        departments={user.isAdmin ? DEPARTMENTS : []}
        me={{ email: user.email, isAdmin: user.isAdmin, isFaculty: user.isFaculty, department: user.department }}
      />
    </>
  );
}
