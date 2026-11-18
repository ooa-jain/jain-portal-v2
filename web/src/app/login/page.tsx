import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { SignInCard } from "./sign-in-card";

export const metadata: Metadata = { title: "Sign in" };

// Hero video from the MotionSites "Real-Time Alerts" design (served from its CDN).
const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_052122_e77a27e6-17f1-4794-889b-3ceaa0e9e8cb.mp4";

function BadgeGlyph() {
  return (
    <svg viewBox="0 0 582 557" aria-hidden className="relative -top-px h-[15px] w-auto">
      <path
        fill="#fff"
        fillRule="evenodd"
        d="M449.0 0.0 435.0 0.0 415.0 10.0 200.0 249.0 187.0 276.0 189.0 299.0 212.0 326.0 232.0 332.0 289.0 334.0 289.0 516.0 301.0 543.0 324.0 556.0 346.0 556.0 374.0 536.0 573.0 311.0 582.0 288.0 579.0 264.0 559.0 240.0 539.0 233.0 478.0 230.0 478.0 32.0 470.0 13.0ZM442.0 38.0 446.0 250.0 466.0 267.0 540.0 270.0 547.0 285.0 341.0 520.0 332.0 522.0 324.0 514.0 321.0 314.0 307.0 300.0 295.0 297.0 233.0 297.0 224.0 291.0 221.0 282.0ZM1.0 67.0 4.0 81.0 17.0 90.0 216.0 90.0 223.0 87.0 232.0 74.0 228.0 57.0 215.0 49.0 18.0 49.0 5.0 57.0ZM0.0 285.0 4.0 300.0 17.0 308.0 105.0 308.0 118.0 299.0 121.0 291.0 119.0 278.0 111.0 270.0 103.0 267.0 17.0 267.0 4.0 275.0ZM1.0 495.0 4.0 511.0 10.0 517.0 23.0 520.0 179.0 520.0 191.0 516.0 200.0 500.0 196.0 488.0 182.0 479.0 18.0 479.0 9.0 483.0Z"
      />
    </svg>
  );
}

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.isAdmin ? "/admin" : "/");

  return (
    <main className="flex min-h-svh flex-1 flex-col bg-[#fefefe] md:h-svh md:flex-row md:overflow-hidden">
      {/* media column */}
      <section className="relative h-[clamp(264px,36svh,320px)] shrink-0 overflow-hidden bg-[linear-gradient(160deg,#3a4250_0%,#7b828c_45%,#c9cdd2_100%)] md:h-auto md:w-[57%]">
        <video
          className="absolute inset-0 h-full w-full object-cover object-[64%_48%] md:object-[100%_50%]"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
        {/* dark scrim on phones so the white headline reads over the video */}
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,13,.02)_18%,rgba(7,10,13,.12)_48%,rgba(7,10,13,.78)_100%)] md:hidden" />
        <div className="absolute bottom-0 left-0 p-6 pb-12 md:p-[clamp(24px,4.5vh,44px)]">
          <div className="rta-in inline-flex h-[31px] items-center gap-2.5 rounded-full bg-[rgba(24,27,30,.82)] px-3 text-[11px] text-white shadow-[0_4px_16px_rgba(0,0,0,.18)] backdrop-blur-[7px] [--d:120ms] md:h-[34px] md:bg-[#2f2a27] md:pl-[19px] md:pr-4 md:text-[13.6px]">
            <BadgeGlyph />
            Built for every department
          </div>
          <h1 className="mt-3 font-[640] leading-[1.02] tracking-[-0.035em] text-white [text-shadow:0_2px_18px_rgba(0,0,0,.32)] md:mt-[clamp(10px,2vh,20px)] md:text-[#000] md:[text-shadow:none]">
            <span className="rta-in rta-clip block text-[clamp(30px,8.8vw,38px)] [--d:240ms] md:text-[min(4.6vw,8.2vh,66px)]">Plan, Review &amp; Submit</span>
            <span className="rta-in rta-clip block text-[clamp(30px,8.8vw,38px)] [--d:330ms] md:text-[min(4.6vw,8.2vh,66px)]">Effortlessly</span>
          </h1>
        </div>
      </section>

      {/* sign-in pane */}
      <section className="relative -mt-7 flex flex-1 md:mt-0 md:min-h-0 md:p-3.5 md:pl-px">
        <div className="rta-in flex w-full flex-col justify-center rounded-t-[28px] bg-white px-[clamp(24px,7vw,38px)] pb-[max(30px,env(safe-area-inset-bottom))] pt-9 shadow-[0_-10px_28px_rgba(20,28,36,.10)] [--d:40ms] md:rounded-[26px] md:border md:border-black/[.036] md:bg-[rgba(254,254,254,.9)] md:overflow-y-auto md:px-[clamp(28px,5vw,62px)] md:py-[clamp(16px,3vh,36px)] md:shadow-[1px_10px_14px_rgba(10,14,20,.14),0_1px_3px_rgba(10,14,20,.05)] md:backdrop-blur-[28px]">
          <SignInCard domain={env.allowedDomain} demo={env.demoLogin} />
        </div>
      </section>
    </main>
  );
}
