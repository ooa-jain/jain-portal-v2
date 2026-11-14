import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, FileCheck2, Lightbulb } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { Mascot } from "@/components/mascot";
import { SignInCard } from "./sign-in-card";

export const metadata: Metadata = { title: "Sign in" };

/** Small status cards that float around the mascot, showing what the portal does. */
function Chip({ icon: Icon, title, text, className }: { icon: typeof CheckCircle2; title: string; text: string; className: string }) {
  return (
    <div className={`login-chip absolute flex items-center gap-2.5 rounded-2xl bg-white/95 py-2.5 pl-2.5 pr-4 shadow-[0_16px_30px_-16px_rgba(10,14,40,.6)] ${className}`}>
      <span className="flex size-8 items-center justify-center rounded-xl bg-[#e6f0fb] text-[#2f6fb8]">
        <Icon className="size-4" />
      </span>
      <span className="leading-tight">
        <span className="block text-[12.5px] font-bold text-[#23263f]">{title}</span>
        <span className="block text-[11px] text-[#66708a]">{text}</span>
      </span>
    </div>
  );
}

/** The picture panel: deep blue, glowing rings, Nimbus and floating status cards. */
function Scene() {
  return (
    <div className="relative flex min-h-[360px] flex-col overflow-hidden rounded-[22px] bg-[radial-gradient(120%_90%_at_30%_20%,#4b8fd6_0%,#2c4f99_42%,#1d2142_100%)] md:min-h-[600px]">
      {/* dotted texture */}
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:20px_20px]" />
      {/* glowing rings behind the mascot */}
      <div aria-hidden className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2">
        <span className="login-ring absolute left-1/2 top-1/2 size-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
        <span className="login-ring absolute left-1/2 top-1/2 size-[330px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 [animation-delay:.6s]" />
        <span className="absolute left-1/2 top-1/2 size-[230px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(169,205,238,.55),rgba(169,205,238,0)_70%)]" />
      </div>

      <div className="relative flex flex-1 items-center justify-center px-6 pt-8">
        <Mascot mood="wave" followPointer className="w-[min(70%,290px)] drop-shadow-[0_24px_30px_rgba(5,8,30,.45)]" />
        <Chip icon={CheckCircle2} title="TLEP approved" text="22CSE301 · Odd 2026-27" className="left-[6%] top-[14%] hidden sm:flex" />
        <Chip icon={FileCheck2} title="Closure submitted" text="Dept. of Commerce" className="bottom-[16%] right-[5%] hidden sm:flex [animation-delay:1.2s]" />
        <Chip icon={Lightbulb} title="IEA · 12 entries" text="AY 2025-26" className="bottom-[4%] left-[8%] hidden sm:flex [animation-delay:2.4s]" />
      </div>

      <div className="relative px-7 pb-7">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-[#a9cdee]">Office of Academic Affairs</p>
        <p className="mt-2 text-[30px] font-extrabold leading-[1.05] tracking-tight text-white sm:text-[36px]">
          Every semester,
          <br />
          every department,
          <br />
          one place.
        </p>
      </div>
    </div>
  );
}

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.isAdmin ? "/admin" : "/");

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-4 bg-[#eef4fb] px-4 py-8 sm:px-8">
      <div className="relative grid w-full max-w-[1080px] gap-3 rounded-[28px] bg-white p-3 shadow-[0_40px_80px_-40px_rgba(35,38,63,.45)] md:grid-cols-[1.05fr_1fr]">
        <Scene />
        <section className="flex flex-col justify-center px-4 py-8 sm:px-10">
          <SignInCard config={env.firebase} domain={env.allowedDomain} />
        </section>
      </div>
      <p className="relative max-w-[1080px] text-center text-[12px] text-[#66708a]">
        Jain OOA Portal · JAIN (Deemed-to-be University) · Faculty filling a checklist do not need to sign in: open the link your HOD shared.
      </p>
    </main>
  );
}
