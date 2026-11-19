"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, LogIn, MailCheck, UserPlus } from "lucide-react";
import { completeFacultySignup, startFacultySignup } from "@/app/actions/faculty-signup";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

/**
 * Shown above the checklist when the visitor is not signed in: create a
 * faculty login (email proved by a code) or sign in, so their responses and
 * documents are kept together and the next checklist can start from this one.
 */
export function FacultySignup({
  token,
  dept,
  hodName,
  domain,
  canSignUp,
}: {
  token: string;
  dept: string;
  hodName: string;
  domain: string;
  canSignUp: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
    <section className="rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[16px] font-bold text-primary">Faculty of {dept}</h2>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            With a faculty login you get your own menu: the checklists {hodName ? `${hodName} shares` : "your HOD shares"}, what you have submitted, and
            your course documents. Next time you can start from the answers you gave here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canSignUp && !open && (
            <Button onClick={() => setOpen(true)}>
              <UserPlus /> Create my login
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={loginHref}>
              <LogIn /> I have a login
            </Link>
          </Button>
        </div>
      </div>

      {!canSignUp && (
        <p className="mt-3 text-[13px] text-muted-foreground">Ask your HOD to create your faculty login, or fill the checklist below without one.</p>
      )}

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
    </section>
  );
}
