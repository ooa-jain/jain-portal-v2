import { MODULES, facultySectionsFor } from "@/lib/constants";
import type { Prefill } from "@/lib/faculty-prefill";
import type { Submission } from "@/lib/types";
import { FacultyForm } from "./faculty-form";

/** The checklist for one share link: who it is for, and the form. Used signed in and signed out. */
export function FacultyChecklistView({
  parent,
  token,
  account,
  prefills,
}: {
  parent: Submission;
  token: string;
  account: { name: string; email: string } | null;
  prefills: { current: Prefill | null; previous: Prefill | null };
}) {
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
    <>
      <h1 className="text-2xl font-semibold text-primary">Faculty {meta.short} Checklist</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Fill this once for the courses you teach. Your HOD sees your response as soon as you submit.
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl bg-hero p-5 text-hero-foreground sm:grid-cols-3 dark:border dark:border-border">
        {context.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-white/60">{label}</dt>
            <dd className="text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <FacultyForm
        shareToken={token}
        sections={facultySectionsFor(parent.form_type)}
        moduleLabel={meta.label}
        account={account}
        current={prefills.current}
        previous={prefills.previous}
      />
    </>
  );
}
