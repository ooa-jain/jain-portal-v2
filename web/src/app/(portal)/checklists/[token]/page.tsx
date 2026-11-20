import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getSubmissionByToken } from "@/lib/data";
import { facultyPrefills } from "@/lib/faculty-prefill";
import { Notice } from "@/components/ui/page";
import { FacultyChecklistView } from "@/app/faculty-form/[token]/view";

export const metadata: Metadata = { title: "Faculty checklist" };

/** A checklist link opened while signed in: same form, inside the portal, with your details filled in. */
export default async function SignedInChecklistPage({ params }: PageProps<"/checklists/[token]">) {
  const { token } = await params;
  const user = await requireUser();
  const parent = await getSubmissionByToken(token);
  if (!parent) {
    return (
      <Notice tone="danger" title="This link is not valid">
        The checklist link may have been mistyped, or your HOD may have removed the submission it belonged to.{" "}
        <Link href="/checklists" className="font-semibold underline">See your checklists</Link>
      </Notice>
    );
  }
  // A link belongs to one department: accounts from other departments cannot open it.
  if (!user.isAdmin && user.department !== parent.identity.dept) {
    return (
      <Notice tone="danger" title="This checklist is for another department">
        This link was shared by {parent.identity.dept}. Your account belongs to {user.department || "no department"}, so you cannot open it.{" "}
        <Link href="/checklists" className="font-semibold underline">See your checklists</Link>
      </Notice>
    );
  }
  const prefills = await facultyPrefills(user.email, parent);
  return (
    <div className="mx-auto w-full max-w-3xl">
      <FacultyChecklistView parent={parent} token={token} account={{ name: user.name, email: user.email }} prefills={prefills} />
    </div>
  );
}
