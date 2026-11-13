import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { runDeadlineReminders } from "@/lib/reminders";

/**
 * Scheduled deadline reminders. Call every 10 minutes from a systemd timer or cron:
 *   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:8088/api/cron/deadline-reminders
 * It runs in one place (the scheduler), so reminders are never duplicated per worker.
 */
export async function POST(request: Request) {
  const secret = env.cronSecret;
  if (!secret) return new Response("Not found", { status: 404 });
  const given = Buffer.from((request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json({ ok: true, ...(await runDeadlineReminders()) });
}
