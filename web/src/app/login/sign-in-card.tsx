"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ClipboardCheck, FolderOpen, Loader2, Lightbulb } from "lucide-react";
import { SignInPage, type Testimonial } from "@/components/ui/sign-in";
import { signInAsDemo, signInWithPassword } from "@/app/actions/auth";
import type { DemoRole } from "@/lib/constants";

// What the portal covers, shown as cards over the campus video.
const HIGHLIGHTS: Testimonial[] = [
  { icon: <ClipboardCheck className="h-5 w-5" />, name: "Semester Readiness", handle: "Before the semester", text: "Curriculum, faculty allocation, timetable and approvals, filed by every department." },
  { icon: <FolderOpen className="h-5 w-5" />, name: "Document Library", handle: "One copy per course", text: "TLEPs, lesson plans and reports, checked on upload and reviewed by the HOD." },
  { icon: <Lightbulb className="h-5 w-5" />, name: "Innovation & Emerging Areas", handle: "UGC data collection", text: "Programmes and courses in emerging areas, with evidence, year by year." },
];

/** The portal's sign-in, using the shared SignInPage layout. */
export function SignInCard({ domain, demo }: { domain: string; demo: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
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

  function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    go("password", () => signInWithPassword(email, password, form.get("rememberMe") === "on"));
  }

  return (
    <SignInPage
      logo={<Image src="/brand/jain-logo.png" alt="JAIN (Deemed-to-be University)" width={900} height={223} priority className="h-[clamp(32px,5.4vh,44px)] w-auto" />}
      title={
        <span className="font-light tracking-tighter text-foreground">
          Welcome to <span className="font-semibold">Jain OOA Portal</span>
        </span>
      }
      description="Sign in with your university email and the password issued by the Office of Academic Affairs."
      emailPlaceholder={`name@${domain}`}
      heroImageSrc="/login/campus-poster.jpg"
      heroVideoSrc="/login/campus.mp4"
      heroOverlay={<Image src="/brand/jain-logo-light.png" alt="" width={900} height={223} className="h-11 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,.35)]" />}
      testimonials={HIGHLIGHTS}
      error={error || undefined}
      pending={busy === "password"}
      resetPasswordLabel="Forgot password?"
      onSignIn={handleSignIn}
      onResetPassword={() => setError("Passwords are issued by the Office of Academic Affairs. Ask them to reset yours.")}
      footer={<>No account? Ask the Office of Academic Affairs.</>}
    >
      {demo && (
        <div>
          <div className="relative flex items-center justify-center">
            <span className="w-full border-t border-border"></span>
            <span className="absolute bg-background px-4 text-sm text-muted-foreground">Or try a demo account</span>
          </div>
          <div className="mt-[clamp(12px,2.2vh,20px)] grid grid-cols-2 gap-3">
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
                className="flex items-center justify-center gap-2 rounded-2xl border border-border py-[clamp(10px,1.9vh,14px)] text-[15px] font-medium transition-colors hover:bg-secondary disabled:opacity-60"
              >
                {busy === role && <Loader2 className="h-4 w-4 animate-spin" />}
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </SignInPage>
  );
}
