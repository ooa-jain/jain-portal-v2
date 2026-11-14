"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signInWithPassword } from "@/app/actions/auth";
import { GoogleSignIn, type FirebaseConfig } from "./google-sign-in";

const field =
  "h-11 w-full rounded-xl border border-[#dbe6f2] bg-[#f5f9fe] px-3.5 text-[14px] text-[#23263f] placeholder:text-[#9aa6bd] focus:border-[#3d7ec7] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#3d7ec7]/15";

export function SignInCard({ config, domain }: { config: FirebaseConfig; domain: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await signInWithPassword(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(result.redirectTo);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[360px] flex-col">
      <Image src="/brand/jain.png" alt="JAIN (Deemed-to-be University)" width={120} height={35} className="mx-auto h-9 w-auto" priority />
      <h1 className="mt-6 text-center text-[26px] font-extrabold uppercase tracking-tight text-[#23263f]">Welcome back</h1>
      <p className="mt-1 text-center text-[13.5px] text-[#66708a]">Enter your email and password to access your account</p>

      <form onSubmit={submit} className="mt-7 flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-[#23263f]">Email</span>
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
              className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-lg text-[#66708a] hover:bg-[#e4eefa] hover:text-[#23263f]"
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </span>
        </label>
        <div className="-mt-1 flex justify-end">
          <button type="button" onClick={() => setHelp((v) => !v)} className="text-[12.5px] font-semibold text-[#2f6fb8] hover:underline" aria-expanded={help}>
            Forgot password?
          </button>
        </div>
        {help && (
          <p className="-mt-2 rounded-xl bg-[#eaf3fd] px-3 py-2 text-[12.5px] text-[#2f4b73]">
            Passwords are issued by the Office of Academic Affairs. Ask them to reset yours, or sign in with Google below.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-[#f5c2c2] bg-[#fdf0f0] px-3 py-2 text-[13px] text-[#b42318]">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || !email || !password}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#23263f] text-[14.5px] font-bold text-white shadow-[0_10px_20px_-10px_rgba(35,38,63,.7)] transition hover:bg-[#353a63] disabled:opacity-50"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-[12px] text-[#9aa6bd]">
        <span className="h-px flex-1 bg-[#dbe6f2]" />or<span className="h-px flex-1 bg-[#dbe6f2]" />
      </div>
      <GoogleSignIn config={config} domain={domain} />

      <p className="mt-6 text-center text-[12.5px] text-[#66708a]">
        Don&apos;t have an account? <span className="font-semibold text-[#23263f]">Your login is created by the Office of Academic Affairs.</span>
      </p>
    </div>
  );
}
