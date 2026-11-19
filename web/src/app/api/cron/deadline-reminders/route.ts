import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { runDeadlineReminders, runFacultyChecklistReminders } from "@/lib/reminders";

/**
 * Scheduled reminders: module deadlines (HODs) and faculty checklists (faculty,
 * plus a list to the HOD). Call every 10 minutes from cron:
 *   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:8091/api/cron/deadline-reminders
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
  const modules = await runDeadlineReminders();
  const faculty = await runFacultyChecklistReminders();
  return Response.json({ ok: true, modules, faculty });
}
