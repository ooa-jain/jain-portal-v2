"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/app/actions/auth";

export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-[18px]">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function GoogleSignIn({ config, domain }: { config: FirebaseConfig; domain: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setBusy(true);
    setError("");
    try {
      // Loaded on demand so the Firebase SDK is not part of the initial page.
      const [{ initializeApp, getApps }, { getAuth, GoogleAuthProvider, signInWithPopup, signOut }] =
        await Promise.all([import("firebase/app"), import("firebase/auth")]);
      const app = getApps()[0] ?? initializeApp(config);
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ hd: domain, prompt: "select_account" });

      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      const response = await signInWithGoogle(idToken);
      // The portal keeps its own session cookie; the Firebase session is not needed after this.
      await signOut(auth).catch(() => {});

      if (!response.ok) {
        setError(response.error);
        setBusy(false);
        return;
      }
      router.replace(response.redirectTo);
      router.refresh();
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setError("");
      } else if (code === "auth/popup-blocked") {
        setError("Your browser blocked the sign-in window. Allow pop-ups for this site and try again.");
      } else if (code === "auth/unauthorized-domain") {
        setError("This web address is not yet authorised for Google sign-in. Please contact the Office of Academic Affairs.");
      } else {
        console.error(err);
        setError("Sign-in did not complete. Please try again.");
      }
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button variant="outline" size="lg" className="h-14 w-full rounded-full border-[1.5px] border-[#c8c8ca] bg-white/90 text-[16px] font-normal text-[#232424] shadow-[0_1px_2px_rgba(0,0,0,.03)] hover:bg-white hover:shadow-[0_3px_10px_rgba(0,0,0,.07)] md:h-[59px] md:text-[18px]" onClick={handleClick} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <GoogleMark />}
        {busy ? "Signing in…" : "Sign in with Google"}
      </Button>
      {error && (
        <p role="alert" className="rounded-lg border border-[#fecaca] bg-destructive-soft px-3 py-2 text-[13px] text-[#b42318]">
          {error}
        </p>
      )}
    </div>
  );
}
