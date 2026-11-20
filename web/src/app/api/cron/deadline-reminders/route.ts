import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { EMAILS_PER_RUN, runDeadlineReminders, runFacultyChecklistReminders } from "@/lib/reminders";

// One run at a time per server process: a slow run is not stacked on by the next schedule tick.
let running = false;

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
  if (running) return Response.json({ ok: true, busy: true });
  running = true;
  try {
    // Both kinds share one budget, so a run always ends in about a minute or two.
    const budget = { left: EMAILS_PER_RUN };
    const modules = await runDeadlineReminders(new Date(), budget);
    const faculty = await runFacultyChecklistReminders(new Date(), budget);
    return Response.json({ ok: true, modules, faculty, budgetLeft: budget.left });
  } finally {
    running = false;
  }
}
