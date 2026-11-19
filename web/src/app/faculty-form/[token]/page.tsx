import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LinkIcon } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getSubmissionByToken } from "@/lib/data";
import { env } from "@/lib/env";
import { ThemeToggle } from "@/components/theme-toggle";
import { FacultySignup } from "./faculty-signup";
import { FacultyChecklistView } from "./view";

export const metadata: Metadata = { title: "Faculty checklist", robots: { index: false } };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-grid flex min-h-svh flex-col">
      <header className="border-b bg-topbar">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4 sm:px-6">
          <Image src="/brand/jain-logo.png" alt="JAIN (Deemed-to-be University)" width={900} height={223} className="h-9 w-auto" priority />
          <span className="border-l pl-3 text-[13px] font-bold uppercase tracking-[0.08em] text-primary">Jain OOA Portal</span>
          <ThemeToggle className="ml-auto" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

export default async function FacultyFormPage({ params }: PageProps<"/faculty-form/[token]">) {
  const { token } = await params;
  // Signed in: the same checklist, inside the portal with the menu.
  if (await getCurrentUser()) redirect(`/checklists/${encodeURIComponent(token)}`);

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

  return (
    <Shell>
      <FacultySignup token={token} dept={parent.identity.dept} hodName={parent.identity.hodName} domain={env.allowedDomain} canSignUp={Boolean(env.mail)} />
      <div className="mt-8">
        <FacultyChecklistView parent={parent} token={token} account={null} prefills={{ current: null, previous: null }} />
      </div>
    </Shell>
  );
}
