"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, LogIn, MailCheck, UserPlus } from "lucide-react";
import { completeFacultySignup, startFacultySignup } from "@/app/actions/faculty-signup";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

/**
 * What a faculty member sees when they open a shared link signed out: who
 * shared which checklist, then register (first time; email proved by a code)
 * or log in. The checklist itself opens once they are signed in.
 */
export function FacultySignup({
  token,
  dept,
  hodName,
  checklistName,
  domain,
  canSignUp,
}: {
  token: string;
  dept: string;
  hodName: string;
  /** e.g. "Faculty Readiness Checklist" */
  checklistName: string;
  domain: string;
  canSignUp: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(canSignUp);
  const [step, setStep] = useState<"details" | "code">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const loginHref = `/login?next=${encodeURIComponent(`/faculty-form/${token}`)}`;

  function sendCode(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await startFacultySignup(token, name, email);
      if (!result.ok) return void setError(result.error);
      setStep("code");
    });
  }

  function create(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirm) return void setError("The two passwords do not match.");
    startTransition(async () => {
      const result = await completeFacultySignup(token, email, code, password);
      if (!result.ok) return void setError(result.error);
      router.replace(result.redirectTo);
      router.refresh();
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="bg-hero px-5 py-5 text-hero-foreground">
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/70">Shared with you</p>
        <h1 className="mt-1.5 text-[20px] font-bold leading-snug sm:text-[22px]">
          {hodName || "Your HOD"}, Head of {dept}, has shared the {checklistName} with you.
        </h1>
        <p className="mt-1.5 text-[13.5px] text-white/75">
          {canSignUp
            ? "First time here? Register with your university email and a password. Already registered? Log in. Then fill the checklist."
            : "Fill the checklist below for the courses you teach."}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-5 pt-4">
        {canSignUp && (
          <Button variant={open ? "default" : "outline"} onClick={() => setOpen(true)}>
            <UserPlus /> First time? Register
          </Button>
        )}
        <Button variant={open ? "outline" : "default"} asChild>
          <Link href={loginHref}>
            <LogIn /> Already registered? Log in
          </Link>
        </Button>
      </div>
      <div className="px-5 pb-5">
      {open && step === "details" && (
        <form onSubmit={sendCode} className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <Input required value={name} autoComplete="name" placeholder="Dr. / Prof. your name" onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="University email" required>
            <Input required type="email" value={email} autoComplete="email" placeholder={`you@${domain}`} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={pending || !name || !email}>
              {pending ? <Loader2 className="animate-spin" /> : <MailCheck />} Email me a code
            </Button>
            <span className="text-[12.5px] text-muted-foreground">We send a 6-digit code to prove the address is yours.</span>
          </div>
          {error && <p role="alert" className="text-[13px] text-destructive sm:col-span-2">{error}</p>}
        </form>
      )}

      {open && step === "code" && (
        <form onSubmit={create} className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-3">
          <p className="text-[13px] text-foreground sm:col-span-3">
            We emailed a code to <strong>{email}</strong>. Enter it and choose a password.{" "}
            <button type="button" className="font-semibold text-link hover:underline" onClick={() => setStep("details")}>
              Change email
            </button>
          </p>
          <Field label="Code" required>
            <Input required inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="Password" required>
            <Input required type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Confirm password" required>
            <Input required type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
            <Button type="submit" disabled={pending || code.length !== 6 || !password}>
              {pending ? <Loader2 className="animate-spin" /> : <KeyRound />} Create login and continue
            </Button>
            <span className="text-[12.5px] text-muted-foreground">At least 8 characters, with letters and numbers.</span>
          </div>
          {error && <p role="alert" className="text-[13px] text-destructive sm:col-span-3">{error}</p>}
        </form>
      )}
      </div>
    </section>
  );
}
