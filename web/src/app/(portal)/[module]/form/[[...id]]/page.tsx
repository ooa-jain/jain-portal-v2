import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireFormModule } from "@/lib/access";
import { canEditSubmission, canViewSubmission, getSubmission, listFacultySubmissions } from "@/lib/data";
import { FREE_EDIT_LIMIT } from "@/lib/constants";
import { env } from "@/lib/env";
import { SubmissionWizard } from "@/components/submission-wizard";

export const metadata: Metadata = { title: "Submission" };

export default async function FormPage({ params, searchParams }: PageProps<"/[module]/form/[[...id]]">) {
  const { module: segment, id: idParts } = await params;
  const { module, user, settings, access } = await requireFormModule(segment);
  if (idParts && idParts.length > 1) notFound();
  const id = idParts?.[0];
  const stepParam = Number((await searchParams).step);

  let submission = null;
  if (id) {
    submission = await getSubmission(id);
    if (!submission || submission.form_type !== module || !canViewSubmission(user, submission)) notFound();
  } else if (!access.canWrite) {
    // No new submissions after the deadline without late access.
    redirect(`/${module}`);
  }
  const faculty = submission ? await listFacultySubmissions(submission._id) : [];

  const owns = submission ? canEditSubmission(user, submission) : true;
  let lockReason: "deadline" | "edit-limit" | null = null;
  if (submission && owns) {
    if (!access.canWrite) lockReason = "deadline";
    else if (
      !user.isAdmin &&
      !submission._draft &&
      submission.edit_count >= FREE_EDIT_LIMIT &&
      submission.edit_request?.status !== "approved"
    ) {
      lockReason = "edit-limit";
    }
  }

  return (
    <SubmissionWizard
      module={module}
      submission={submission}
      faculty={faculty}
      canEdit={owns && lockReason === null}
      lockReason={lockReason}
      isAdmin={user.isAdmin}
      years={settings.enabled_years}
      semesters={settings.enabled_semesters}
      defaults={{ name: user.name, email: user.email, department: user.department }}
      mailEnabled={env.mail !== null}
      initialStep={Number.isInteger(stepParam) ? stepParam - 1 : 0}
    />
  );
}
