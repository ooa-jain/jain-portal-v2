import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/access";
import { canEditSubmission, canViewSubmission, getSubmission, listFacultySubmissions } from "@/lib/data";
import { env } from "@/lib/env";
import { SubmissionWizard } from "@/components/submission-wizard";

export const metadata: Metadata = { title: "Submission" };

export default async function FormPage({ params, searchParams }: PageProps<"/[module]/form/[[...id]]">) {
  const { module: segment, id: idParts } = await params;
  const { module, user, settings } = await requireModule(segment);
  if (idParts && idParts.length > 1) notFound();
  const id = idParts?.[0];
  const stepParam = Number((await searchParams).step);

  let submission = null;
  if (id) {
    submission = await getSubmission(id);
    if (!submission || submission.form_type !== module || !canViewSubmission(user, submission)) notFound();
  }
  const faculty = submission ? await listFacultySubmissions(submission._id) : [];

  return (
    <SubmissionWizard
      module={module}
      submission={submission}
      faculty={faculty}
      canEdit={submission ? canEditSubmission(user, submission) : true}
      years={settings.enabled_years}
      semesters={settings.enabled_semesters}
      defaults={{ name: user.name, email: user.email, department: user.department }}
      mailEnabled={env.mail !== null}
      initialStep={Number.isInteger(stepParam) ? stepParam - 1 : 0}
    />
  );
}
