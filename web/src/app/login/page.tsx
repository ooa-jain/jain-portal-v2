import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { SignInCard } from "./sign-in-card";

export const metadata: Metadata = { title: "Sign in" };

// JAIN campus aerial video (muted, looped). The poster shows while it loads.
const HERO_VIDEO = "/login/campus.mp4";
const HERO_POSTER = "/login/campus-poster.jpg";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.isAdmin ? "/admin" : "/");

  return (
    <main className="flex min-h-svh flex-1 flex-col bg-white md:h-svh md:flex-row md:overflow-hidden">
      {/* campus video */}
      <section className="relative h-[clamp(220px,34svh,300px)] shrink-0 overflow-hidden bg-[#2a3340] md:h-auto md:w-1/2">
        <video
          className="absolute inset-0 h-full w-full object-cover object-center"
          poster={HERO_POSTER}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
        {/* soft shade at the top so the white logo reads on the bright sky */}
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,14,30,.55)_0%,rgba(8,14,30,.15)_28%,rgba(8,14,30,0)_45%)]" />
        <Image
          src="/brand/jain-logo-light.png"
          alt="JAIN (Deemed-to-be University)"
          width={900}
          height={223}
          priority
          className="rta-in absolute left-6 top-6 h-10 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,.35)] [--d:120ms] md:left-9 md:top-9 md:h-12"
        />
      </section>

      {/* sign-in */}
      <section className="relative -mt-6 flex flex-1 items-center justify-center rounded-t-[26px] bg-white px-6 pb-[max(28px,env(safe-area-inset-bottom))] pt-8 md:mt-0 md:rounded-none md:px-12 md:py-[clamp(20px,4vh,48px)]">
        <SignInCard domain={env.allowedDomain} demo={env.demoLogin} />
      </section>
    </main>
  );
}
