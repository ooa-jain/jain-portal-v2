"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { signInWithPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GoogleSignIn, type FirebaseConfig } from "./google-sign-in";

type Tab = "password" | "google";

export function SignInCard({ config, domain }: { config: FirebaseConfig; domain: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
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
    <div className="w-full max-w-[420px] rounded-2xl border bg-white p-7 shadow-[0_24px_48px_-28px_rgba(16,24,40,.35)]">
      <h2 className="text-[24px] font-bold text-primary">Sign in</h2>
      <p className="mt-1 text-[13.5px] text-muted-foreground">Use your university account to continue.</p>

      <div role="tablist" aria-label="Sign-in method" className="mt-5 grid grid-cols-2 rounded-xl bg-[#f2f4f7] p-1">
        {([
          ["password", "Email & password"],
          ["google", "Google"],
        ] as const).map(([value, label]) => (
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
              "rounded-lg py-2 text-[13px] font-semibold transition-colors",
              tab === value ? "bg-white text-primary shadow-[0_1px_3px_rgba(16,24,40,.12)]" : "text-[#475467] hover:text-primary",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "password" ? (
        <form onSubmit={submit} className="mt-5 flex flex-col gap-4" noValidate>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-[#344054]">Email</span>
            <span className="relative">
              <Mail className="pointer-events-none absolute left-3 top-3 size-4 text-[#98a2b3]" />
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`name@${domain}`}
                className="h-11 w-full rounded-lg border border-input bg-white pl-9 pr-3 text-[14px] placeholder:text-[#98a2b3] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              />
            </span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-[#344054]">Password</span>
            <span className="relative">
              <input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="h-11 w-full rounded-lg border border-input bg-white pl-3 pr-11 text-[14px] placeholder:text-[#98a2b3] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-md text-[#667085] hover:bg-hover hover:text-primary"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
          </label>
          {error && (
            <p role="alert" className="rounded-lg border border-[#fecaca] bg-destructive-soft px-3 py-2 text-[13px] text-[#b42318]">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="h-11 rounded-lg text-[14.5px]" disabled={pending || !email || !password}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Sign in
            {!pending && <ArrowRight />}
          </Button>
          <p className="text-[12.5px] leading-relaxed text-[#5b6474]">
            No password, or forgot it? Use Google, or ask the Office of Academic Affairs to set one for you.
          </p>
        </form>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          <p className="text-[13.5px] text-[#475467]">
            Continue with your <span className="font-semibold text-primary">@{domain}</span> Google account. No
            password needed.
          </p>
          <GoogleSignIn config={config} domain={domain} />
        </div>
      )}
    </div>
  );
}
