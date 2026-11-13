import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { startSessionFor } from "@/lib/login";

/**
 * Local testing only: sign in as any email without Google.
 * Works only when DEV_LOGIN=1 and the app is not a production build.
 */
export async function GET(request: Request) {
  if (!env.devLogin) return new Response("Not found", { status: 404 });
  const email = (new URL(request.url).searchParams.get("email") ?? "").trim().toLowerCase();
  if (!email) return new Response("Add ?email=someone@jainuniversity.ac.in", { status: 400 });
  await startSessionFor({ email, name: email.split("@")[0], picture: "" });
  redirect("/");
}
