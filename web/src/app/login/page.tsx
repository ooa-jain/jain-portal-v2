import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ClipboardCheck, FileCheck2, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { GoogleSignIn } from "./google-sign-in";

export const metadata: Metadata = { title: "Sign in" };

const POINTS = [
  { icon: ClipboardCheck, title: "Semester Readiness", text: "Confirm your department is ready before classes begin." },
  { icon: FileCheck2, title: "Semester Closure", text: "Report how the semester went and what carries forward." },
  { icon: Users, title: "Faculty checklists", text: "Share one link; faculty responses arrive for your review." },
];

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.isAdmin ? "/admin" : "/");

  return (
    <main className="grid flex-1 lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div className="absolute -right-24 -top-24 size-96 rounded-full border-[48px] border-accent/15" aria-hidden />
        <div className="absolute -bottom-40 -left-20 size-[28rem] rounded-full border-[56px] border-white/5" aria-hidden />
        <div className="relative">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">Office of Academics</p>
          <h1 className="mt-4 max-w-md text-4xl font-semibold leading-tight">
            Jain Sarathi
            <span className="mt-2 block text-xl font-normal text-white/75">
              One place for every department&apos;s semester readiness and closure.
            </span>
          </h1>
        </div>
        <ul className="relative flex flex-col gap-6">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-accent">
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block font-medium">{title}</span>
                <span className="block text-sm text-white/70">{text}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="relative text-xs text-white/50">JAIN (Deemed-to-be University)</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <Image src="/brand/jain.png" alt="JAIN (Deemed-to-be University)" width={220} height={64} priority className="h-14 w-auto" />
          <h2 className="mt-10 text-2xl font-semibold">Sign in</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use your university Google account (<span className="font-medium text-foreground">@{env.allowedDomain}</span>).
          </p>
          <div className="mt-8">
            <GoogleSignIn config={env.firebase} domain={env.allowedDomain} />
          </div>
          <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
            Faculty filling a checklist do not need to sign in. Open the link your HOD shared with you.
          </p>
        </div>
      </section>
    </main>
  );
}
