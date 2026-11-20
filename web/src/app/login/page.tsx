import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { SignInCard } from "./sign-in-card";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "Sign in" };

/** Only a same-site path, e.g. the checklist link the user came from. */
function safeNext(value: unknown) {
  return typeof value === "string" && /^\/(?!\/)[\w\-./?=&%]*$/.test(value) ? value : "";
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext((await searchParams).next);
  const user = await getCurrentUser();
  if (user) redirect(next || (user.isAdmin ? "/admin" : "/"));

  return (
    <main className="relative flex-1 bg-background text-foreground">
      <ThemeToggle className="absolute right-4 top-4 z-20 md:left-4 md:right-auto" />
      <SignInCard domain={env.allowedDomain} demo={env.demoLogin} next={next} />
    </main>
  );
}
