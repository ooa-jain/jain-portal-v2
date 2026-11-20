import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { collections } from "@/lib/db";
import { ALL_DEPTS_LIMIT, knownCourses, listDocuments, scopeFilter } from "@/lib/documents";
import { DEPARTMENTS } from "@/lib/constants";
import { PageHeader } from "@/components/ui/page";
import { DocumentLibrary } from "@/components/document-library";

export const metadata: Metadata = { title: "Document Library" };

export default async function DocumentsPage({ searchParams }: PageProps<"/documents">) {
  const user = await requireUser();
  const params = await searchParams;
  const deptParam = typeof params.dept === "string" ? params.dept : "";
  const dept = user.isAdmin ? (DEPARTMENTS.includes(deptParam) ? deptParam : "") : user.department;

  const scope = user.isAdmin && !dept ? {} : scopeFilter(user, dept || undefined);
  const semesterParam = typeof params.semester === "string" ? params.semester : "";
  const [settings, usedSemesters, newest, courses] = await Promise.all([
    getSettings(),
    collections.documents().distinct("semester", scope),
    collections.documents().find(scope, { projection: { semester: 1 } }).sort({ uploaded_at: -1 }).limit(1).next(),
    knownCourses(dept),
  ]);
  const offered = [...settings.enabled_years].sort().reverse().flatMap((y) => settings.enabled_semesters.map((s) => `${s} ${y}`));
  // Semesters that already hold documents stay selectable even if no longer offered.
  const semesters = [...new Set([...offered, ...usedSemesters.map(String).filter(Boolean)])];
  // Open on the semester people are working in: the most recent upload's, else the newest offered.
  // Only that semester's documents are loaded ("all" loads every semester, capped), so the page stays light.
  const initialSemester =
    semesterParam === "all" ? "" : semesters.includes(semesterParam) ? semesterParam : String(newest?.semester ?? "") || offered[0] || "";
  const documents = await listDocuments(
    initialSemester ? { ...scope, semester: initialSemester } : scope,
    user.isAdmin && !dept ? { limit: ALL_DEPTS_LIMIT } : initialSemester ? {} : { limit: ALL_DEPTS_LIMIT },
  );

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
