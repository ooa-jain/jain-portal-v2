import type { Metadata } from "next";
import Image from "next/image";
import { LinkIcon } from "lucide-react";
import { getSubmissionByToken } from "@/lib/data";
import { MODULES, facultySectionsFor } from "@/lib/constants";
import { FacultyForm } from "./faculty-form";

export const metadata: Metadata = { title: "Faculty checklist", robots: { index: false } };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4 sm:px-6">
          <Image src="/brand/jain.png" alt="JAIN (Deemed-to-be University)" width={138} height={40} className="h-9 w-auto" priority />
          <span className="border-l pl-3 text-sm font-semibold text-primary">Office of Academics</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </>
  );
}

export default async function FacultyFormPage({ params }: PageProps<"/faculty-form/[token]">) {
  const { token } = await params;
  const parent = await getSubmissionByToken(token);

  if (!parent) {
    return (
      <Shell>
        <div className="rounded-xl border bg-card p-10 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive-soft text-destructive">
            <LinkIcon className="size-5" />
          </span>
          <h1 className="mt-4 text-xl font-semibold">This link is not valid</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            The checklist link may have been mistyped, or your HOD may have removed the submission it belonged to.
            Ask your HOD to share the link again.
          </p>
        </div>
      </Shell>
    );
  }

  const meta = MODULES[parent.form_type];
  const context = [
    ["Department", parent.identity.dept],
    ["Campus", parent.identity.campus],
    ["Semester", parent.identity.semester],
    ["Academic year", parent.identity.acYear],
    ["HOD", parent.identity.hodName],
    ["Submit by", parent.identity.hodDeadline],
  ].filter(([, value]) => value);

  return (
    <Shell>
      <h1 className="text-2xl font-semibold">Faculty {meta.short} Checklist</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Fill this once for the courses you teach. Your HOD will see your response as soon as you submit.
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl bg-primary p-5 text-primary-foreground sm:grid-cols-3">
        {context.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-white/60">{label}</dt>
            <dd className="text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <FacultyForm shareToken={token} sections={facultySectionsFor(parent.form_type)} moduleLabel={meta.label} />
    </Shell>
  );
}
