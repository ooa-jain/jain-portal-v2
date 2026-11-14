import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { Clouds, Mascot } from "@/components/mascot";
import { SignInCard } from "./sign-in-card";

export const metadata: Metadata = { title: "Sign in" };

/** The picture panel: sky, a grassy hill, and Nimbus waving. */
function Scene() {
  return (
    <div className="relative flex min-h-[340px] flex-col overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,#7fb4e6_0%,#a9cdee_45%,#d9ebfb_100%)] md:min-h-[600px]">
      <Clouds className="opacity-90" />
      <svg aria-hidden viewBox="0 0 600 200" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[30%] w-full">
        <path d="M0 90 Q150 30 320 70 T600 60 V200 H0 Z" fill="#8fbf78" />
        <path d="M0 130 Q200 80 400 120 T600 110 V200 H0 Z" fill="#78ab63" />
      </svg>
      <div className="relative flex flex-1 items-center justify-center px-6 pt-6">
        <Mascot mood="wave" followPointer className="w-[min(78%,330px)] drop-shadow-[0_18px_24px_rgba(35,38,63,.18)]" />
      </div>
      <p className="relative px-6 pb-6 text-[34px] font-extrabold uppercase leading-[0.95] tracking-tight text-white [text-shadow:0_2px_12px_rgba(35,38,63,.35)] sm:text-[42px]">
        Plan.
        <br />
        Review.
        <br />
        Grow.
      </p>
    </div>
  );
}

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.isAdmin ? "/admin" : "/");

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden px-4 py-8 sm:px-8">
      <Clouds />
      <div className="relative grid w-full max-w-[1040px] gap-3 rounded-[28px] bg-white p-3 shadow-[0_40px_80px_-40px_rgba(35,38,63,.45)] md:grid-cols-2">
        <Scene />
        <section className="flex flex-col justify-center px-4 py-8 sm:px-10">
          <SignInCard config={env.firebase} domain={env.allowedDomain} />
        </section>
      </div>
      <p className="relative max-w-[1040px] text-center text-[12px] text-[#4b5a7a]">
        Jain OOA Portal · Office of Academic Affairs · JAIN (Deemed-to-be University) · Faculty filling a checklist do not need to sign in: open the link your HOD shared.
      </p>
    </main>
  );
}
