"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { signInAsDemo, signInWithPassword } from "@/app/actions/auth";
import type { DemoRole } from "@/lib/constants";

const field =
  "h-12 w-full border-0 border-b-2 border-[#d4d7dd] bg-transparent px-0 text-[17px] text-[#1d2330] placeholder:text-[#a0a5ad] focus:border-[#1d2330] focus:outline-none";

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
    <div className="w-full max-w-[420px]">
      <p className="rta-in text-[13px] font-semibold uppercase tracking-[0.16em] text-[#8a9099] [--d:200ms]">Jain OOA Portal</p>
      <h1 className="rta-in mt-3 text-[clamp(32px,min(8vw,5.6vh),42px)] font-[650] leading-[1.05] tracking-[-0.04em] text-[#1d2330] [--d:300ms]">
        Good to see
        <br />
        you again.
      </h1>

      <form onSubmit={submit} className="mt-[clamp(20px,4vh,36px)] flex flex-col gap-[clamp(14px,2.6vh,22px)]" noValidate>
        <input
          type="email"
          autoComplete="email"
          aria-label="Email address"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={`name@${domain}`}
          className={`rta-in ${field} [--d:420ms]`}
        />
        <span className="rta-in relative block [--d:490ms]">
          <input
            type={show ? "text" : "password"}
            autoComplete="current-password"
            aria-label="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className={`${field} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-0 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#6b7280] hover:text-[#1d2330]"
          >
            {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        </span>

        <div className="rta-in flex items-center justify-between text-[14px] [--d:560ms]">
          <label className="flex cursor-pointer items-center gap-2 text-[#1d2330]">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-[#1d2330]" />
            Remember me
          </label>
          <button type="button" onClick={() => setHelp((v) => !v)} aria-expanded={help} className="text-[#6b7280] hover:text-[#1d2330]">
            Forgot password?
          </button>
        </div>
        {help && (
          <p className="rounded-xl bg-[#f3f4f6] px-4 py-2.5 text-[13px] text-[#1d2330]">
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
          className="rta-in group mt-1 flex h-14 items-center justify-between rounded-full bg-[#1d2330] pl-7 pr-2 text-[16px] font-semibold text-white transition hover:bg-[#283139] disabled:opacity-60 [--d:640ms]"
        >
          Sign in
          <span className="flex size-10 items-center justify-center rounded-full bg-white/15 transition group-hover:translate-x-0.5">
            {busy === "password" ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          </span>
        </button>
      </form>

      {demo && (
        <div className="rta-in [--d:740ms]">
          <div className="my-[clamp(16px,3vh,26px)] flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#a0a5ad]">
            <i className="h-px flex-1 bg-[#e4e6ea]" /> or try a demo <i className="h-px flex-1 bg-[#e4e6ea]" />
          </div>
          <div className="flex gap-2">
            {(
              [
                ["hod", "Demo HOD"],
                ["faculty", "Demo Faculty"],
              ] as const
            ).map(([role, label]) => (
              <button
                key={role}
                type="button"
                disabled={busy !== ""}
                onClick={() => go(role, () => signInAsDemo(role))}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-[#d4d7dd] text-[14px] font-semibold text-[#1d2330] transition hover:border-[#1d2330] disabled:opacity-60"
              >
                {busy === role && <Loader2 className="size-4 animate-spin" />}
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="rta-in mt-[clamp(16px,3vh,28px)] text-[13px] leading-relaxed text-[#8a9099] [--d:820ms]">
        No account? Ask the Office of Academic Affairs. Faculty filling a checklist can use the link their HOD shared, without signing in.
      </p>
    </div>
  );
}
