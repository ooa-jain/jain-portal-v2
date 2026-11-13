import { collections } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** Count app installs and launches (shown to admins). Signed-in users only. */
export async function POST(request: Request) {
  if (!(await getCurrentUser())) return new Response(null, { status: 401 });
  const { event } = (await request.json().catch(() => ({}))) as { event?: string };
  const field = event === "install" ? "installs" : event === "launch" ? "launches" : null;
  if (!field) return new Response(null, { status: 400 });
  await collections.pwaAnalytics().updateOne({ _id: "pwa_stats" }, { $inc: { [field]: 1 } }, { upsert: true });
  return new Response(null, { status: 204 });
}
