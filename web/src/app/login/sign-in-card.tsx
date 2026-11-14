"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signInWithPassword } from "@/app/actions/auth";
import { GoogleSignIn, type FirebaseConfig } from "./google-sign-in";

export function SignInCard({ config, domain }: { config: FirebaseConfig; domain: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await signInWithPassword(email, password, remember);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(result.redirectTo);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-[489px]">
      <h2 className="rta-in text-center text-[clamp(31px,8.8vw,38px)] font-[600] tracking-[-0.06em] text-[#2c3343] [--d:470ms] md:text-[42.5px]">
        Welcome Back!
      </h2>
      <p className="rta-in mt-2 text-center text-[15px] tracking-[-0.012em] text-[#797979] [--d:570ms] md:text-[18px]">
        <b className="text-[#2c3343]">Log in</b> to continue to the Jain OOA Portal.
      </p>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-3" noValidate>
        <input
          type="email"
          autoComplete="email"
          aria-label="Email address"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={`Eg. name@${domain}`}
          className="rta-in h-14 w-full rounded-xl border-[1.5px] border-[#acacae] bg-[#fafafa] px-[17px] text-[16px] text-[#000] placeholder:text-[#606060] focus:border-[#2c3343] focus:outline-none [--d:720ms] md:h-[61px] md:text-[15.7px]"
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
            className="h-14 w-full rounded-xl border-[1.5px] border-transparent bg-[#f4f4f5] px-[18px] pr-12 text-[16px] text-[#000] placeholder:text-[#606060] focus:border-[#2c3343] focus:outline-none md:h-[59px] md:text-[17px]"
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
            Passwords are issued by the Office of Academic Affairs. Ask them to reset yours, or sign in with Google below.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-[#f5c2c2] bg-[#fdf0f0] px-4 py-2.5 text-[13.5px] text-[#b42318]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !email || !password}
          className="rta-in mt-2 flex h-[58px] items-center justify-center gap-2.5 rounded-full bg-[linear-gradient(180deg,#283139_0%,#293340_100%)] text-[16.4px] tracking-[0.2px] text-white shadow-[0_8px_20px_rgba(18,26,34,.16),0_2px_5px_rgba(18,26,34,.10)] transition-[transform,filter,box-shadow] duration-200 [--d:930ms] hover:brightness-[1.12] active:translate-y-px disabled:opacity-60 md:h-[65px]"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Login
          {!pending && (
            <svg viewBox="0 0 22 22" aria-hidden className="w-[13px]">
              <path d="M3 11h15.4M11 3.3l7.7 7.7-7.7 7.7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          )}
        </button>
      </form>

      <div className="rta-in my-7 flex items-center gap-4 [--d:1060ms]" aria-hidden>
        <i className="h-[1.5px] flex-1 bg-[#b1b1b2]" />
        <b className="text-[11.5px] font-bold tracking-[0.8px] text-[#5a5a5b]">OR</b>
        <i className="h-[1.5px] flex-1 bg-[#b1b1b2]" />
      </div>

      <div className="rta-in [--d:1150ms]">
        <GoogleSignIn config={config} domain={domain} />
      </div>

      <p className="rta-in mt-7 text-center text-[14px] text-[#0a0a0a] [--d:1260ms] md:text-[16px]">
        Don&#8217;t have an account? <b className="underline decoration-2 underline-offset-[3px]">Ask the Office of Academic Affairs</b>
      </p>
      <p className="mt-3 text-center text-[12px] text-[#797979]">Faculty filling a checklist do not need to sign in: open the link your HOD shared.</p>
    </div>
  );
}
