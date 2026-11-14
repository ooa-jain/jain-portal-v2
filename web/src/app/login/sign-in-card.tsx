"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signInWithPassword } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import { GoogleSignIn, type FirebaseConfig } from "./google-sign-in";

const field =
  "h-11 w-full rounded-md border border-[#cfd9e6] bg-white px-3.5 text-[14px] text-[#23263f] placeholder:text-[#9aa6bd] focus:border-[#1f5d86] focus:outline-none focus:ring-4 focus:ring-[#1f5d86]/15";

export function SignInCard({ config, domain }: { config: FirebaseConfig; domain: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"email" | "google">("email");
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
    <div className="w-full max-w-[400px]">
      <h1 className="text-[26px] font-bold tracking-tight text-[#23263f]">Welcome to Jain OOA Portal</h1>
      <p className="mt-1.5 text-[13.5px] text-[#475467]">Semester readiness, closure and course documents for every department.</p>

      <div role="tablist" aria-label="Sign-in method" className="mt-7 flex justify-center gap-8 border-b border-[#e4e9f0]">
        {([["email", "Email"], ["google", "Google"]] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => {
              setTab(value);
              setError("");
            }}
            className={cn(
              "-mb-px border-b-2 px-2 pb-2 text-[14px] font-semibold transition-colors",
              tab === value ? "border-[#1f5d86] text-[#23263f]" : "border-transparent text-[#9aa6bd] hover:text-[#475467]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "email" ? (
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4" noValidate>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-[#23263f]">Email address</span>
            <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={`name@${domain}`} className={field} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-[#23263f]">Password</span>
            <span className="relative">
              <input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={`${field} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded text-[#66708a] hover:bg-[#eef3f8] hover:text-[#23263f]"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
          </label>
          <div className="flex items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#23263f]">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-[#1f5d86]" />
              Keep me signed in
            </label>
            <button type="button" onClick={() => setHelp((v) => !v)} aria-expanded={help} className="text-[13px] font-semibold text-[#1f5d86] underline underline-offset-2 hover:text-[#174a6b]">
              Forgot password?
            </button>
          </div>
          {help && (
            <p className="rounded-md bg-[#eef5fb] px-3 py-2 text-[12.5px] text-[#2f4b73]">
              Passwords are issued by the Office of Academic Affairs. Ask them to reset yours, or use the Google tab.
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-md border border-[#f5c2c2] bg-[#fdf0f0] px-3 py-2 text-[13px] text-[#b42318]">
              {error}
            </p>
          )}
          <p className="text-[12.5px] text-[#66708a]">
            First time here? <span className="font-semibold text-[#23263f]">Your login is created by the Office of Academic Affairs.</span>
          </p>
          <button
            type="submit"
            disabled={pending || !email || !password}
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#1f5d86] text-[14.5px] font-bold text-white transition hover:bg-[#174a6b] disabled:opacity-60"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Sign in
          </button>
        </form>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          <p className="text-[13.5px] text-[#475467]">
            Continue with your <span className="font-semibold text-[#23263f]">@{domain}</span> Google account. No password needed.
          </p>
          <GoogleSignIn config={config} domain={domain} />
        </div>
      )}
    </div>
  );
}
