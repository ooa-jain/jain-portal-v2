import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { SignInCard } from "./sign-in-card";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.isAdmin ? "/admin" : "/");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 bg-[#eef4fb] px-4 py-10">
      <section className="w-full max-w-[440px] rounded-[24px] bg-white px-6 py-10 shadow-[0_30px_60px_-30px_rgba(35,38,63,.4)] sm:px-10">
        <SignInCard config={env.firebase} domain={env.allowedDomain} />
      </section>
      <p className="max-w-[440px] text-center text-[12px] text-[#66708a]">
        Jain OOA Portal · Office of Academic Affairs · JAIN (Deemed-to-be University)
        <br />
        Faculty filling a checklist do not need to sign in: open the link your HOD shared.
      </p>
    </main>
  );
}
