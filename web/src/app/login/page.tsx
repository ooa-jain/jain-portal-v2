import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { DeskIllustration } from "./desk-illustration";
import { SignInCard } from "./sign-in-card";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.isAdmin ? "/admin" : "/");

  return (
    <main className="grid flex-1 bg-white lg:grid-cols-2">
      <section className="relative hidden flex-col bg-[#f3f6fa] px-10 py-8 lg:flex">
        <Image src="/brand/jain.png" alt="JAIN (Deemed-to-be University)" width={130} height={38} className="h-10 w-auto self-start" priority />
        <div className="flex flex-1 items-center justify-center py-8">
          <DeskIllustration className="w-full max-w-[540px]" />
        </div>
        <p className="text-[12px] text-[#66708a]">Office of Academic Affairs · JAIN (Deemed-to-be University)</p>
      </section>

      <section className="flex flex-col px-6 py-8 sm:px-12">
        <Image src="/brand/jain.png" alt="JAIN (Deemed-to-be University)" width={120} height={35} className="h-9 w-auto self-start lg:hidden" priority />
        <div className="flex flex-1 items-center justify-center py-10">
          <SignInCard config={env.firebase} domain={env.allowedDomain} />
        </div>
        <p className="text-center text-[12px] text-[#66708a]">
          Faculty filling a checklist do not need to sign in: open the link your HOD shared.
        </p>
      </section>
    </main>
  );
}
