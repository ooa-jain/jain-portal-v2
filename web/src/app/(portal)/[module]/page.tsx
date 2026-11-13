import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireModule } from "@/lib/access";
import { listMySubmissions } from "@/lib/data";
import { MODULES, isModuleKey } from "@/lib/constants";
import { SubmissionList } from "@/components/submission-list";
import { Button } from "@/components/ui/button";

export async function generateMetadata({ params }: PageProps<"/[module]">): Promise<Metadata> {
  const { module } = await params;
  return { title: isModuleKey(module) ? MODULES[module].label : "Not found" };
}

export default async function ModulePage({ params }: PageProps<"/[module]">) {
  const { module: segment } = await params;
  const { module, user } = await requireModule(segment);
  const meta = MODULES[module];
  const submissions = await listMySubmissions(user, module);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold">{meta.label}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
        </div>
        <Button asChild>
          <Link href={`/${module}/form`}>
            <Plus />
            New submission
          </Link>
        </Button>
      </div>

      {submissions.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <p className="font-medium">No {meta.short.toLowerCase()} submissions yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start one for the current semester. You can save a draft and come back any time.
          </p>
          <Button asChild className="mt-5">
            <Link href={`/${module}/form`}>
              <Plus />
              Start {meta.short.toLowerCase()} submission
            </Link>
          </Button>
        </div>
      ) : (
        <SubmissionList submissions={submissions} currentEmail={user.email} isAdmin={user.isAdmin} />
      )}
    </div>
  );
}
