"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, MailCheck } from "lucide-react";
import { SignInPage } from "@/components/ui/sign-in";
import { signInWithPassword } from "@/app/actions/auth";
import { completeFacultySignup, registerFacultyWithoutCode, startFacultySignup } from "@/app/actions/faculty-signup";
import { cn } from "@/lib/utils";

const fieldBox =
  "mt-1.5 w-full rounded-2xl border border-border bg-foreground/[0.03] px-4 py-[clamp(11px,2vh,16px)] text-[15px] backdrop-blur-sm transition-colors focus:border-link/70 focus:bg-link/[0.06] focus:outline-none";
const fieldLabel = "text-sm font-medium text-muted-foreground";
const primaryButton =
  "flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-[clamp(12px,2.1vh,16px)] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70";

/**
 * A shared checklist link, opened signed out: the same sign-in page as HODs,
 * saying who shared which checklist, with first-time Register and Log in.
 * With email set up, registration proves the address with an emailed code.
 */
export function FacultyAuth({
  token,
  dept,
  hodName,
  checklistName,
  domain,
  verifyEmail,
}: {
  token: string;
  dept: string;
  hodName: string;
  checklistName: string;
  domain: string;
  /** Email a code to prove the address (when the server can send email). */
  verifyEmail: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [step, setStep] = useState<"details" | "code">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const next = `/checklists/${encodeURIComponent(token)}`;

  function switchTo(value: "register" | "login") {
    setMode(value);
    setError("");
  }

  function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const loginEmail = String(form.get("email") ?? "");
    const loginPassword = String(form.get("password") ?? "");
    if (!loginEmail || !loginPassword) return void setError("Enter your email and password.");
    setError("");
    startTransition(async () => {
      const result = await signInWithPassword(loginEmail, loginPassword, form.get("rememberMe") === "on", next);
      if (!result.ok) return void setError(result.error);
      router.replace(result.redirectTo);
      router.refresh();
    });
  }

  function sendCode(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await startFacultySignup(token, name, email);
      if (!result.ok) return void setError(result.error);
      setStep("code");
    });
  }

  function registerWithCode(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirm) return void setError("The two passwords do not match.");
    startTransition(async () => {
      const result = await completeFacultySignup(token, email, code, password);
      if (!result.ok) return void setError(result.error);
      router.replace(next);
      router.refresh();
    });
  }

  function registerDirect(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirm) return void setError("The two passwords do not match.");
    startTransition(async () => {
      const result = await registerFacultyWithoutCode(token, name, email, password);
      if (!result.ok) return void setError(result.error);
      router.replace(result.redirectTo);
      router.refresh();
    });
  }

  const switcher = (
    <div role="tablist" aria-label="Register or log in" className="grid grid-cols-2 rounded-2xl bg-secondary p-1 text-[14px] font-semibold">
      {(
        [
          ["register", "First time? Register"],
          ["login", "Log in"],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={mode === value}
          onClick={() => switchTo(value)}
          className={cn(
            "h-10 rounded-xl transition",
            mode === value ? "bg-card text-primary shadow-[0_1px_4px_rgba(0,0,0,.12)]" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const errorBox = error ? (
    <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive-soft px-4 py-3 text-sm text-destructive">
      {error}
    </div>
  ) : null;

  const nameField = (
    <div>
      <label htmlFor="reg-name" className={fieldLabel}>Full name</label>
      <input id="reg-name" required autoComplete="name" placeholder="Dr. / Prof. your name" value={name} onChange={(e) => setName(e.target.value)} className={fieldBox} />
    </div>
  );
  const emailField = (
    <div>
      <label htmlFor="reg-email" className={fieldLabel}>University email</label>
      <input id="reg-email" type="email" required autoComplete="email" placeholder={`you@${domain}`} value={email} onChange={(e) => setEmail(e.target.value)} className={fieldBox} />
    </div>
  );
  const passwordFields = (
    <div className="grid gap-[clamp(12px,2.2vh,20px)] sm:grid-cols-2">
      <div>
        <label htmlFor="reg-password" className={fieldLabel}>Password</label>
        <input id="reg-password" type="password" required autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={fieldBox} />
      </div>
      <div>
        <label htmlFor="reg-confirm" className={fieldLabel}>Confirm password</label>
        <input id="reg-confirm" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={fieldBox} />
      </div>
    </div>
  );
  const registerButton = (disabled: boolean) => (
    <button type="submit" disabled={pending || disabled} className={primaryButton}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
      Register and open the checklist
    </button>
  );
  const passwordHint = <p className="text-center text-[12.5px] text-muted-foreground">Password: at least 8 characters, with letters and numbers.</p>;

  const registerForm = !verifyEmail ? (
    // The server cannot send email: register with name, university email and password.
    <form className="space-y-[clamp(12px,2.2vh,20px)]" onSubmit={registerDirect} noValidate>
      {nameField}
      {emailField}
      {passwordFields}
      {errorBox}
      {registerButton(!name || !email || !password)}
      {passwordHint}
    </form>
  ) : step === "details" ? (
    <form className="space-y-[clamp(12px,2.2vh,20px)]" onSubmit={sendCode} noValidate>
      {nameField}
      {emailField}
      {errorBox}
      <button type="submit" disabled={pending || !name || !email} className={primaryButton}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
        Email me a code
      </button>
      <p className="text-center text-[12.5px] text-muted-foreground">We send a 6-digit code to prove the address is yours.</p>
    </form>
  ) : (
    <form className="space-y-[clamp(12px,2.2vh,20px)]" onSubmit={registerWithCode} noValidate>
      <p className="text-[13.5px] text-foreground">
        We emailed a code to <strong>{email}</strong>.{" "}
        <button type="button" className="font-semibold text-link hover:underline" onClick={() => setStep("details")}>Change</button>
      </p>
      <div>
        <label htmlFor="reg-code" className={fieldLabel}>Code</label>
        <input id="reg-code" required inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className={cn(fieldBox, "tracking-[0.3em]")} />
      </div>
      {passwordFields}
      {errorBox}
      {registerButton(code.length !== 6 || !password)}
      {passwordHint}
    </form>
  );

  return (
    <SignInPage
      logo={<Image src="/brand/jain-logo.png" alt="JAIN (Deemed-to-be University)" width={900} height={223} priority className="h-[clamp(32px,5.4vh,44px)] w-auto" />}
      title={
        <span className="font-light tracking-tighter text-foreground">
          Faculty <span className="font-semibold">{checklistName.replace(/^Faculty\s+/, "")}</span>
        </span>
      }
      description={
        <>
          <strong className="font-semibold text-foreground">{hodName || "Your HOD"}</strong>, Head of{" "}
          <strong className="font-semibold text-foreground">{dept}</strong>, has shared the {checklistName} with you.{" "}
          {mode === "register" ? "Register once with your university email, then fill it." : "Log in to fill it."}
        </>
      }
      emailPlaceholder={`name@${domain}`}
      heroImageSrc="/login/campus-poster.jpg"
      heroVideoSrc="/login/campus.mp4"
      heroOverlay={<Image src="/brand/jain-logo-light.png" alt="" width={900} height={223} className="h-11 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,.35)]" />}
      beforeForm={switcher}
      form={mode === "register" ? registerForm : undefined}
      error={mode === "login" && error ? error : undefined}
      pending={mode === "login" && pending}
      resetPasswordLabel="Forgot password?"
      onSignIn={signIn}
      onResetPassword={() => setError("Ask the Office of Academic Affairs to reset your password.")}
      footer={
        mode === "register" ? (
          <>Already registered? <button type="button" onClick={() => switchTo("login")} className="font-semibold text-link hover:underline">Log in</button></>
        ) : (
          <>First time here? <button type="button" onClick={() => switchTo("register")} className="font-semibold text-link hover:underline">Register</button></>
        )
      }
    />
  );
}
