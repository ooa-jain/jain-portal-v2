import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ClipboardCheck, FileCheck2, Lightbulb, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { env } from "@/lib/env";
import { SignInCard } from "./sign-in-card";

export const metadata: Metadata = { title: "Sign in" };

const MODULES = [
  { icon: ClipboardCheck, title: "Semester Readiness", text: "HOD checklist and faculty checklists before the semester begins." },
  { icon: FileCheck2, title: "Semester Closure", text: "The HOD report and course-wise closure at the end of term." },
  { icon: Lightbulb, title: "Innovation & Emerging Areas", text: "New programmes and innovations, AY 2022-23 to 2026-27." },
];

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.isAdmin ? "/admin" : "/");
  const settings = await getSettings();
  const cycle = [...settings.enabled_years].sort().pop()?.replace("-", "–") ?? "";

  return (
    <main className="grid flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* brand panel */}
      <section className="relative flex flex-col overflow-hidden bg-[radial-gradient(130%_90%_at_0%_0%,#1d4ed8_0%,#0e2a5c_45%,#0a1d42_100%)] px-[6vw] py-8 text-white lg:px-12 lg:py-10">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.10)_1px,transparent_1px)] [background-size:22px_22px]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-40 size-[28rem] rounded-full border-[56px] border-white/[0.04]" />

        <Image src="/brand/jain-light.png" alt="JAIN (Deemed-to-be University)" width={140} height={40} className="relative h-10 w-auto self-start" priority />

        <div className="relative my-10 lg:my-auto">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#c7d2fe]">
            Office of Academic Affairs{cycle && ` · ${cycle}`}
          </p>
          <h1 className="mt-3 text-[40px] font-bold leading-[1.05] sm:text-[52px]">
            Jain <span className="hl !text-[#0e2a5c]">OOA</span> Portal
          </h1>
          <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-white/80">
            One place for every department&apos;s academic records: fill each module, share the faculty checklist, and
            submit to the Office.
          </p>

          <ul className="mt-8 hidden max-w-md flex-col gap-3 sm:flex">
            {MODULES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3.5 rounded-xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-sm">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[#f2cd73]">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block text-[14px] font-semibold">{title}</span>
                  <span className="block text-[13px] text-white/70">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative hidden items-center gap-2 text-[12px] text-white/60 lg:flex">
          <ShieldCheck className="size-4" />
          JAIN (Deemed-to-be University) · Bengaluru &amp; Kochi
        </p>
      </section>

      {/* sign-in */}
      <section className="flex flex-col items-center justify-center gap-6 px-5 py-10 sm:px-10">
        <SignInCard config={env.firebase} domain={env.allowedDomain} />
        <p className="max-w-[420px] text-center text-[12.5px] leading-relaxed text-[#5b6474]">
          Faculty filling a checklist do not need to sign in: open the link your HOD shared with you.
        </p>
      </section>
    </main>
  );
}
