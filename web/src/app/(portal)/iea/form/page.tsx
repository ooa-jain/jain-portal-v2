import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireModuleAccess } from "@/lib/access";
import { findMyIea } from "@/lib/iea";
import { isValidIeaUnit } from "@/lib/constants";
import { IeaEditor } from "@/components/iea-editor";

export const metadata: Metadata = { title: "IEA submission" };

export default async function IeaFormPage({ searchParams }: PageProps<"/iea/form">) {
  const { user, access } = await requireModuleAccess("iea");
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const unit = { school: one(params.school), department: one(params.dept), level: one(params.level) };
  if (!isValidIeaUnit(unit.school, unit.department, unit.level)) notFound();

  const submission = await findMyIea(user.email, unit.school, unit.department, unit.level);
  return (
    <IeaEditor
      // A different unit is a different form: start with fresh state.
      key={`${unit.school}|${unit.department}|${unit.level}`}
      unit={unit}
      submission={submission}
      canWrite={access.canWrite}
    />
  );
}
