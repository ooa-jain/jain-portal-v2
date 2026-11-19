"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, FlaskConical, GraduationCap, Loader2, UserRound } from "lucide-react";
import { signInAsDemo, signInWithPassword } from "@/app/actions/auth";
import type { DemoRole } from "@/lib/constants";

export function SignInCard({ domain, demo }: { domain: string; demo: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState<"" | "password" | DemoRole>("");
  const [, startTransition] = useTransition();

  function go(kind: "password" | DemoRole, run: () => ReturnType<typeof signInWithPassword>) {
    setError("");
    setBusy(kind);
    startTransition(async () => {
      const result = await run();
      if (!result.ok) {
        setError(result.error);
        setBusy("");
        return;
      }
      router.replace(result.redirectTo);
      router.refresh();
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    go("password", () => signInWithPassword(email, password, remember));
  }

  return (
    <div className="mx-auto w-full max-w-[460px]">
      <Image
        src="/brand/jain-logo.png"
        alt="JAIN (Deemed-to-be University)"
        width={900}
        height={223}
        priority
        className="rta-in mx-auto mb-[clamp(8px,1.8vh,22px)] h-[clamp(34px,6vh,46px)] w-auto [--d:300ms]"
      />
      {demo && (
        <div className="rta-in mb-[clamp(10px,2.4vh,28px)] rounded-2xl border border-dashed border-[#c8c8ca] bg-[#fafafa] p-3 [--d:380ms]">
          <p className="flex items-center gap-1.5 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#5a5a5b]">
            <FlaskConical className="size-3.5" /> Demo login for test users
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                ["hod", "Demo HOD", UserRound],
                ["faculty", "Demo Faculty", GraduationCap],
              ] as const
            ).map(([role, label, Icon]) => (
              <button
                key={role}
                type="button"
                disabled={busy !== ""}
                onClick={() => go(role, () => signInAsDemo(role))}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d4d7dd] bg-white text-[14px] font-semibold text-[#2c3343] transition hover:border-[#2c3343] hover:shadow-[0_3px_10px_rgba(0,0,0,.06)] disabled:opacity-60"
              >
                {busy === role ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <h2 className="rta-in text-center text-[clamp(30px,min(8.8vw,5.4vh),40px)] font-[600] tracking-[-0.05em] text-[#2c3343] [--d:470ms]">
        Welcome Back!
      </h2>
      <p className="rta-in mt-1.5 text-center text-[15px] tracking-[-0.012em] text-[#797979] [--d:570ms] md:text-[17px]">
        <b className="text-[#2c3343]">Log in</b> to continue to the Jain OOA Portal.
      </p>

      <form onSubmit={submit} className="mt-[clamp(18px,3.4vh,32px)] flex flex-col gap-3" noValidate>
        <input
          type="email"
          autoComplete="email"
          aria-label="Email address"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={`Eg. name@${domain}`}
          className="rta-in h-[clamp(48px,7vh,58px)] w-full rounded-xl border-[1.5px] border-[#acacae] bg-[#fafafa] px-[17px] text-[16px] text-[#000] placeholder:text-[#606060] focus:border-[#2c3343] focus:outline-none [--d:720ms] md:text-[15.5px]"
        />
        <span className="rta-in relative block [--d:790ms]">
          <input
            type={show ? "text" : "password"}
            autoComplete="current-password"
            aria-label="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="h-[clamp(48px,7vh,58px)] w-full rounded-xl border-[1.5px] border-transparent bg-[#f4f4f5] px-[18px] pr-12 text-[16px] text-[#000] placeholder:text-[#606060] focus:border-[#2c3343] focus:outline-none md:text-[15.5px]"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-2.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#606060] hover:bg-black/5 hover:text-[#000]"
          >
            {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        </span>

        <div className="rta-in flex items-center justify-between px-1 text-[13.5px] [--d:840ms]">
          <label className="flex cursor-pointer items-center gap-2 text-[#2c3343]">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-[#283139]" />
            Keep me signed in
          </label>
          <button type="button" onClick={() => setHelp((v) => !v)} aria-expanded={help} className="font-bold text-[#000] underline decoration-2 underline-offset-[3px]">
            Forgot password?
          </button>
        </div>
        {help && (
          <p className="rounded-xl bg-[#f4f4f5] px-4 py-2.5 text-[13px] text-[#2c3343]">
            Passwords are issued by the Office of Academic Affairs. Ask them to reset yours.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-[#f5c2c2] bg-[#fdf0f0] px-4 py-2.5 text-[13.5px] text-[#b42318]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy !== "" || !email || !password}
          className="rta-in mt-1 flex h-[clamp(50px,7.4vh,60px)] items-center justify-center gap-2.5 rounded-full bg-[linear-gradient(180deg,#283139_0%,#293340_100%)] text-[16px] tracking-[0.2px] text-white shadow-[0_8px_20px_rgba(18,26,34,.16),0_2px_5px_rgba(18,26,34,.10)] transition-[transform,filter,box-shadow] duration-200 [--d:930ms] hover:brightness-[1.12] active:translate-y-px disabled:opacity-60"
        >
          {busy === "password" ? <Loader2 className="size-4 animate-spin" /> : null}
          Login
          {busy !== "password" && (
            <svg viewBox="0 0 22 22" aria-hidden className="w-[13px]">
              <path d="M3 11h15.4M11 3.3l7.7 7.7-7.7 7.7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          )}
        </button>
      </form>

      <p className="rta-in mt-[clamp(16px,3vh,28px)] text-center text-[14px] text-[#0a0a0a] [--d:1060ms] md:text-[15px]">
        Don&#8217;t have an account? <b className="underline decoration-2 underline-offset-[3px]">Ask the Office of Academic Affairs</b>
      </p>
      <p className="mt-2 text-center text-[12px] text-[#797979]">Faculty filling a checklist do not need to sign in: open the link your HOD shared.</p>
    </div>
  );
}
