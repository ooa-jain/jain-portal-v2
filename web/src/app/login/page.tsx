import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { env } from "@/lib/env";
import { GoogleSignIn } from "./google-sign-in";

export const metadata: Metadata = { title: "Sign in" };

function Panel({
  title,
  tone,
  items,
  className,
}: {
  title: string;
  tone: "lp-blue" | "lp-slate" | "lp-glass";
  items: { label: string; done?: boolean }[];
  className: string;
}) {
  return (
    <div className={`lp ${tone} ${className}`} aria-hidden>
      <span className="absolute right-3 top-2.5 size-2.5 rounded-full bg-white shadow-[inset_0_0_0_2px_rgba(11,23,48,.35)]" />
      <p className={`mb-3 text-[15px] font-extrabold ${tone === "lp-glass" ? "text-primary" : "text-white [text-shadow:0_1px_2px_rgba(0,0,0,.3)]"}`}>{title}</p>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.label} className="lp-card">
            <b className="truncate text-[12px] text-primary">{item.label}</b>
            <i />
            <i />
            <span
              className={`absolute right-2.5 top-1/2 flex size-[22px] -translate-y-1/2 items-center justify-center rounded-full ${item.done ? "bg-success text-white" : "bg-[#e7ecf4] text-transparent"}`}
            >
              <Check className="size-3.5" strokeWidth={3} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.isAdmin ? "/admin" : "/");
  const settings = await getSettings();
  const cycle = [...settings.enabled_years].sort().pop()?.replace("-", "–") ?? "";

  return (
    <main className="flex flex-1 flex-col">
      <div className="grid flex-1 items-center gap-10 px-[5vw] pb-[6vh] pt-[5vh] lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:gap-16">
        <section className="order-2 lg:order-1">
          <Image src="/brand/jain.png" alt="JAIN (Deemed-to-be University)" width={152} height={44} className="h-11 w-auto" priority />
          <p className="mt-8 text-[12px] font-bold uppercase tracking-[0.14em] text-[#475467]">
            Office of Academic Affairs{cycle && ` | ${cycle}`}
          </p>
          <h1 className="mt-2 text-[44px] font-bold leading-[1.08] tracking-[-0.01em] text-primary sm:text-[48px]">Jain OOA Portal</h1>
          <p className="mt-4 max-w-[460px] text-[16px] leading-relaxed text-[#475467]">
            Your department&apos;s semester record, module by module: readiness, closure and innovation. Fill each one,
            tick it off, and it goes to the Office of Academic Affairs.
          </p>

          <div className="mt-7 rounded-2xl border bg-white p-6 shadow-[0_20px_40px_-28px_rgba(16,24,40,.35)]">
            <p className="text-[13px] font-semibold text-[#344054]">Sign in with your university Google account</p>
            <p className="mb-4 mt-1 text-[13px] text-muted-foreground">
              Only <span className="font-semibold text-primary">@{env.allowedDomain}</span> accounts can sign in.
            </p>
            <GoogleSignIn config={env.firebase} domain={env.allowedDomain} />
            <p className="mt-4 text-[12.5px] leading-relaxed text-[#5b6474]">
              Faculty filling a checklist do not need to sign in: open the link your HOD shared. No access, or it stopped
              working? Write to the Office of Academic Affairs.
            </p>
          </div>
        </section>

        <section
          className="login-stage relative order-1 h-[300px] overflow-hidden rounded-[28px] sm:h-[420px] lg:order-2 lg:h-[min(72vh,600px)]"
          aria-label="How the portal works"
        >
          <div className="absolute inset-0 [perspective:1400px]">
            <Panel title="Innovation" tone="lp-slate" className="left-[8%] top-[17%] h-[52%] w-[34%] [transform:rotateY(18deg)_rotateX(4deg)] opacity-90"
              items={[{ label: "New programmes" }, { label: "Evidence" }, { label: "Versions" }]} />
            <Panel title="Closure" tone="lp-glass" className="left-[20%] top-[13%] h-[56%] w-[36%] [transform:rotateY(14deg)_rotateX(3deg)]"
              items={[{ label: "HOD report" }, { label: "Faculty checklists" }, { label: "Course completion" }]} />
            <Panel title="Readiness" tone="lp-blue" className="left-[36%] top-[9%] h-[62%] w-[44%] [transform:rotateY(8deg)_rotateX(2deg)]"
              items={[{ label: "HOD checklist", done: true }, { label: "Faculty checklists" }, { label: "Review & submit" }]} />
          </div>
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">How it works</p>
            <p className="mt-2 text-[18px] font-bold text-white sm:text-[20px]">Every module, ticked off, then on to the Office.</p>
            <ol className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/80">
              {["Semester Readiness", "Semester Closure", "Innovation & Emerging Areas"].map((step, index) => (
                <li key={step} className="flex items-center gap-2">
                  <span className={`flex size-[22px] items-center justify-center rounded-full text-[11px] font-bold ${index === 0 ? "bg-white text-primary" : "bg-white/15 text-white"}`}>
                    {index + 1}
                  </span>
                  <span className={index === 0 ? "font-semibold text-white" : ""}>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
      <footer className="px-[5vw] pb-6 text-[12px] text-[#5b6474]">JAIN (Deemed-to-be University) · Office of Academic Affairs</footer>
    </main>
  );
}
